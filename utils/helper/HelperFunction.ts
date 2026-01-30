export function cn(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

export const usPhoneRegex = /^\+?1?\s?\(?([0-9]{3})\)?[-.●\s]?([0-9]{3})[-.●\s]?([0-9]{4})$/;
// 🔹 Helper Functions
export function formatNumber(num: string) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatUSPhoneNumber(value: string) {
    const digits = value.replace(/\D/g, "").replace(/^1/, ""); // remove 1 prefix if exists
    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return "+1";
    const [, area, prefix, line] = match;
    let formatted = "";
    if (area) formatted = `(${area}`;
    if (prefix) formatted += `) ${prefix}`;
    if (line) formatted += `-${line}`;
    return `+1 ${formatted}`;
}

// فرمت شماره به صورت +1-555-123-4567
export function formatUSPhoneWithDashes(value: string): string {
    const digits = value.replace(/\D/g, "").replace(/^1/, ""); // حذف همه غیر از اعداد و حذف 1 اول
    if (digits.length === 0) return "+1";

    const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return "+1";

    const [, area, prefix, line] = match;
    let formatted = "+1";

    if (area) {
        formatted += `-${area}`;
        if (prefix) {
            formatted += `-${prefix}`;
            if (line) {
                formatted += `-${line}`;
            }
        }
    }

    return formatted;
}

// تبدیل شماره به فرمت +1-555-123-4567 برای ارسال به بک‌اند
export function normalizeUSPhoneToDashedFormat(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
        const clean = digits.slice(-10);
        return formatUSPhoneWithDashes(clean);
    }
    return value;
}

export function normalizeUSPhoneToE164(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
        const clean = digits.slice(-10);
        return `+1${clean}`;
    }
    return value;
}

/**
 * Normalize website URL to always have https:// prefix
 * @param url - The website URL (with or without protocol)
 * @returns URL with https:// prefix, or empty string if input is empty
 */
export function normalizeWebsiteUrl(url: string | undefined | null): string {
    if (!url || url.trim() === "") return "";
    
    const trimmedUrl = url.trim();
    
    // If already has http:// or https://, return as is (but prefer https)
    if (trimmedUrl.startsWith("https://")) {
        return trimmedUrl;
    }
    if (trimmedUrl.startsWith("http://")) {
        return trimmedUrl.replace("http://", "https://");
    }
    
    // Otherwise, add https://
    return `https://${trimmedUrl}`;
}

// Parse US Driver's License/ID Card data from OCR text
export interface ParsedIDCardData {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    gender?: string;
    idNumber?: string;
    address?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    phone?: string;
    email?: string;
    scannedImage?: string;
}

function formatParsedDate(parts: string[]): string | undefined {
    if (parts.length !== 3) return undefined;
    let month = parts[0];
    let day = parts[1];
    let year = parts[2];
    if (year.length === 2) {
        const yearNum = parseInt(year, 10);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
    }
    if (month.length === 1) month = `0${month}`;
    if (day.length === 1) day = `0${day}`;
    return `${year}-${month}-${day}`;
}

export function parseUSIDCardData(ocrText: string, scannedImage?: string): ParsedIDCardData {
    const data: ParsedIDCardData = {
        scannedImage,
    };

    if (!ocrText) return data;

    const lines = ocrText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    const text = ocrText.toLowerCase();

    // --- Name: US DL often "LAST, FIRST" or labeled "LAST NAME" / "FIRST NAME" or two lines ---
    // 1) "LAST, FIRST" pattern (assign correctly)
    const lastFirstMatch = ocrText.match(/([A-Z][A-Za-z]+),\s*([A-Z][A-Za-z]+)/);
    if (lastFirstMatch) {
        data.lastName = lastFirstMatch[1].trim();
        data.firstName = lastFirstMatch[2].trim();
    }

    // 2) Labeled lines: "LAST NAME" / "FIRST NAME" (or "NAME" with next line content)
    if (!data.firstName || !data.lastName) {
        for (let i = 0; i < lines.length; i++) {
            const lineLower = lines[i].toLowerCase();
            const nextLine = lines[i + 1];
            if (/(?:last\s*name|surname|family\s*name)\s*[:]?/i.test(lines[i]) && nextLine && /^[A-Za-z\s\-']+$/.test(nextLine)) {
                data.lastName = nextLine.trim();
            }
            if (/(?:first\s*name|given\s*name|name)\s*[:]?/i.test(lines[i]) && nextLine && /^[A-Za-z\s\-']+$/.test(nextLine)) {
                const content = nextLine.trim();
                if (!data.firstName) data.firstName = content;
            }
        }
    }

    // 3) "FIRST LAST" style (single line)
    if (!data.firstName || !data.lastName) {
        const firstLastPatterns = [
            /([A-Z][a-z]+)\s+([A-Z][a-z]+)/,
            /([A-Z]{2,})\s+([A-Z]{2,})/,
        ];
        for (const pattern of firstLastPatterns) {
            const match = ocrText.match(pattern);
            if (match) {
                if (!data.firstName) data.firstName = match[1].trim();
                if (!data.lastName) data.lastName = match[2].trim();
                break;
            }
        }
    }

    // 4) Two-line fallback: first two non-label lines as last + first (many US DLs: line1=last, line2=first)
    if ((!data.firstName || !data.lastName) && lines.length >= 2) {
        const nameLikeLines = lines.filter((l) => /^[A-Za-z\s\-']+$/.test(l) && l.length > 1 && !/^\d/.test(l) && !/^(dob|sex|address|id|dln|dl\s*#)/i.test(l));
        if (nameLikeLines.length >= 2) {
            if (!data.lastName) data.lastName = nameLikeLines[0].trim();
            if (!data.firstName) data.firstName = nameLikeLines[1].trim();
        }
    }

    // --- DOB: prefer match near "DOB" or "BIRTH" to avoid issue/expiry dates ---
    const dobLabelPattern = /(?:dob|birth\s*date|birthday|b\.?d\.?)\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i;
    const dobLabelMatch = text.match(dobLabelPattern);
    if (dobLabelMatch) {
        const dateParts = dobLabelMatch[1].split(/[\/\-\.]/);
        const formatted = formatParsedDate(dateParts);
        if (formatted) data.birthDate = formatted;
    }
    if (!data.birthDate) {
        const genericDatePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/;
        const genericMatch = text.match(genericDatePattern);
        if (genericMatch) {
            const dateParts = genericMatch[1].split(/[\/\-\.]/);
            const formatted = formatParsedDate(dateParts);
            if (formatted) data.birthDate = formatted;
        }
    }
    if (!data.birthDate) {
        const shortYear = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2})/;
        const shortMatch = text.match(shortYear);
        if (shortMatch) {
            const dateParts = shortMatch[1].split(/[\/\-\.]/);
            const formatted = formatParsedDate(dateParts);
            if (formatted) data.birthDate = formatted;
        }
    }

    // --- Gender ---
    const genderPatterns = [/(?:sex|gender)\s*[:]?\s*(male|female|m|f)/i, /\b(male|female|m|f)\b/i];
    for (const pattern of genderPatterns) {
        const match = text.match(pattern);
        if (match) {
            const genderStr = match[1].toLowerCase();
            if (genderStr === "m" || genderStr === "male") data.gender = "Male";
            else if (genderStr === "f" || genderStr === "female") data.gender = "Female";
            break;
        }
    }

    // --- ID Number (DLN) ---
    const idPatterns = [
        /(?:dln|dl\s*#|driver\s*license|license\s*#|id\s*#|id\s*number)\s*[:]?\s*([A-Z0-9]{5,})/i,
        /\b([A-Z]{1,2}\d{6,})\b/,
        /\b(\d{8,})\b/,
    ];
    for (const pattern of idPatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            data.idNumber = match[1].trim();
            break;
        }
    }

    // --- Address: multi-line US DL (street line(s) then "CITY, ST 12345" or "CITY ST 12345") ---
    const twoLetterState = /\b([A-Z]{2})\b/;
    const zipPattern = /\b(\d{5})(?:-(\d{4}))?\b/;
    // Line that looks like "CITY, ST 12345" or "CITY ST 12345"
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stateMatch = line.match(twoLetterState);
        const zipMatch = line.match(zipPattern);
        if (stateMatch && zipMatch) {
            const zip = zipMatch[2] ? `${zipMatch[1]}-${zipMatch[2]}` : zipMatch[1];
            data.addressZip = zip;
            data.addressState = stateMatch[1];
            const beforeZip = line.substring(0, line.indexOf(zipMatch[0])).trim();
            const cityPart = beforeZip.replace(/,?\s*[A-Z]{2}\s*$/, "").trim();
            if (cityPart) data.addressCity = cityPart;
            break;
        }
    }
    // Street: line with number + text (often before city line), or "ADDRESS" labeled
    const streetPatterns = [
        /(?:address|addr|residence)\s*[:]?\s*([0-9]+\s+[A-Z0-9\s,.#]+(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|way|circle|cir|court|ct)[A-Z0-9\s,.]*)/i,
        /([0-9]+\s+[A-Z0-9\s,.#]{8,})/i,
    ];
    for (const pattern of streetPatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            const street = match[1].trim();
            if (!street.match(zipPattern) && !/^[A-Z]{2}$/.test(street)) {
                data.addressStreet = street;
                data.address = data.address || street;
                break;
            }
        }
    }
    if (!data.address && data.addressStreet) data.address = data.addressStreet;

    // --- Phone ---
    const phonePatterns = [
        /(?:phone|tel|mobile|cell)\s*[:]?\s*([\+]?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
        /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/,
    ];
    for (const pattern of phonePatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            data.phone = normalizeUSPhoneToE164(match[1]);
            break;
        }
    }

    // --- Email ---
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/;
    const emailMatch = ocrText.match(emailPattern);
    if (emailMatch) data.email = emailMatch[1];

    return data;
}
