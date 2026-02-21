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
 * Convert ALL CAPS / uppercase text to Title Case (first letter of each word capital, rest lowercase).
 * Used for OCR output from ID cards (e.g. "CARDHOLDER" -> "Cardholder", "ANYTOWN, CA" -> "Anytown, Ca").
 */
export function toTitleCase(value: string | undefined | null): string {
    if (value == null || value.trim() === "") return "";
    return value
        .trim()
        .split(/\s+/)
        .map((word) => {
            if (word.length === 0) return word;
            if (word.length === 1) return word.toUpperCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
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

    // --- California DL: LN/FN با یا بدون فاصله (LNCARDHOLDER, FNIMA یا LN CARDHOLDER, FN IMA) ---
    const lnNoSpace = ocrText.match(/\bLN([A-Z][A-Za-z\-']+)(?:\s|$|\n)/i);
    if (lnNoSpace) data.lastName = lnNoSpace[1].trim();
    const fnNoSpace = ocrText.match(/\bFN([A-Z][A-Za-z\-']+)(?:\s|$|\n)/i);
    if (fnNoSpace) data.firstName = fnNoSpace[1].trim();
    const lnSameLine = ocrText.match(/\bLN\s+([A-Z][A-Za-z\-']+)(?:\s|$|\n)/i);
    if (lnSameLine && !data.lastName) data.lastName = lnSameLine[1].trim();
    const fnSameLine = ocrText.match(/\bFN\s+([A-Z][A-Za-z\-']+)(?:\s|$|\n)/i);
    if (fnSameLine && !data.firstName) data.firstName = fnSameLine[1].trim();
    // LN/FN with value on next line
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*LN\s*$/i.test(lines[i]) && lines[i + 1] && /^[A-Za-z\s\-']+$/.test(lines[i + 1])) {
            if (!data.lastName) data.lastName = lines[i + 1].trim();
        }
        if (/^\s*FN\s*$/i.test(lines[i]) && lines[i + 1] && /^[A-Za-z\s\-']+$/.test(lines[i + 1])) {
            if (!data.firstName) data.firstName = lines[i + 1].trim();
        }
    }

    // --- Name: US DL "LAST, FIRST" pattern ---
    if (!data.firstName || !data.lastName) {
        const lastFirstMatch = ocrText.match(/([A-Z][A-Za-z]+),\s*([A-Z][A-Za-z]+)/);
        if (lastFirstMatch) {
            if (!data.lastName) data.lastName = lastFirstMatch[1].trim();
            if (!data.firstName) data.firstName = lastFirstMatch[2].trim();
        }
    }

    // --- Labeled lines: "LAST NAME" / "FIRST NAME" (or "NAME" with next line content) ---
    if (!data.firstName || !data.lastName) {
        for (let i = 0; i < lines.length; i++) {
            const nextLine = lines[i + 1];
            if (/(?:last\s*name|surname|family\s*name)\s*[:]?/i.test(lines[i]) && nextLine && /^[A-Za-z\s\-']+$/.test(nextLine)) {
                if (!data.lastName) data.lastName = nextLine.trim();
            }
            if (/(?:first\s*name|given\s*name|name)\s*[:]?/i.test(lines[i]) && nextLine && /^[A-Za-z\s\-']+$/.test(nextLine)) {
                const content = nextLine.trim();
                if (!data.firstName) data.firstName = content;
            }
        }
    }

    // --- "FIRST LAST" style (single line) ---
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

    // --- Two-line fallback: first two name-like lines (US DLs: line1=last, line2=first) ---
    if ((!data.firstName || !data.lastName) && lines.length >= 2) {
        const nameLikeLines = lines.filter((l) => /^[A-Za-z\s\-']+$/.test(l) && l.length > 1 && !/^\d/.test(l) && !/^(dob|sex|address|id|dln|dl\s*#|ln|fn)$/i.test(l.trim()));
        if (nameLikeLines.length >= 2) {
            if (!data.lastName) data.lastName = nameLikeLines[0].trim();
            if (!data.firstName) data.firstName = nameLikeLines[1].trim();
        }
    }

    // --- DOB: California DL "DOB 08/31/1977" or "DOB 08311977" (MMDDYYYY) ---
    const dobLabelPattern = /(?:dob|birth\s*date|birthday|b\.?d\.?)\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i;
    const dobLabelMatch = text.match(dobLabelPattern);
    if (dobLabelMatch) {
        const dateParts = dobLabelMatch[1].split(/[\/\-\.]/);
        const formatted = formatParsedDate(dateParts);
        if (formatted) data.birthDate = formatted;
    }
    // DOB as 8 digits MMDDYYYY (e.g. 08311977) — avoid matching EXP or ISS dates by preferring line with DOB
    if (!data.birthDate) {
        const dobEightDigit = ocrText.match(/(?:dob|birth\s*date)\s*[:]?\s*(\d{8})/i);
        if (dobEightDigit) {
            const raw = dobEightDigit[1];
            const month = raw.slice(0, 2);
            const day = raw.slice(2, 4);
            const year = raw.slice(4, 8);
            data.birthDate = `${year}-${month}-${day}`;
        }
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

    // --- ID Number (DL): California DL e.g. I1234568 or 11234568 ---
    const idPatterns = [
        /(?:dln|dl\s*#?|driver\s*license|license\s*#|id\s*#|id\s*number)\s*[:]?\s*([A-Z0-9]{5,})/i,
        /\b(DL|ID)\s*[:]?\s*([A-Z0-9]{5,})(?:\s|$|\n)/i,
        /\b([A-Z]\d{7,})\b/,   // e.g. I1234568
        /\b([A-Z]{1,2}\d{6,})\b/,
        /\b(\d{8,})\b/,
    ];
    for (const pattern of idPatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            // DL/ID label pattern returns [fullMatch, "DL", value]
            const value = match[2] !== undefined ? match[2] : match[1];
            if (value && value.length >= 5) {
                data.idNumber = value.trim();
                break;
            }
        }
    }

    // --- Address: California DL — street line (e.g. "2570 24TH STREET") then "CITY, ST ZIP" (e.g. "ANYTOWN, CA 95818") ---
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
    // Street: California style "NUMBER + STREET" (e.g. 2570 24TH STREET, 123 MAIN ST)
    const streetPatterns = [
        /(?:address|addr|residence)\s*[:]?\s*([0-9]+\s+[A-Z0-9\s,.#]+(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|way|circle|cir|court|ct)[A-Z0-9\s,.]*)/i,
        /([0-9]{2,5}\s+[A-Z0-9]+(?:TH|ST|ND|RD)?\s+(?:STREET|ST|AVENUE|AVE|ROAD|RD|BLVD|DRIVE|DR|LANE|LN)[A-Z0-9\s,.]*)/i,
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
    if (!data.address && (data.addressStreet || data.addressCity)) {
        const parts = [data.addressStreet, data.addressCity, data.addressState, data.addressZip].filter(Boolean);
        data.address = parts.join(", ");
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

    // Normalize text fields from OCR ALL CAPS to Title Case (only first letter capital)
    if (data.firstName) data.firstName = toTitleCase(data.firstName);
    if (data.lastName) data.lastName = toTitleCase(data.lastName);
    if (data.addressStreet) data.addressStreet = toTitleCase(data.addressStreet);
    if (data.addressCity) data.addressCity = toTitleCase(data.addressCity);
    if (data.addressStreet || data.addressCity || data.addressState || data.addressZip) {
        const parts = [data.addressStreet, data.addressCity, data.addressState, data.addressZip].filter(Boolean);
        data.address = parts.join(", ");
    } else if (data.address) {
        data.address = toTitleCase(data.address);
    }

    return data;
}
