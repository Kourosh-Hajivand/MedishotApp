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

// Parse US Driver's License/ID Card data from OCR text
export interface ParsedIDCardData {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    gender?: string;
    idNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    scannedImage?: string;
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

    // Extract First Name and Last Name
    // Common patterns: "DON   JOHN", "LAST, FIRST", "FIRST LAST"
    const namePatterns = [
        /([A-Z]{2,})\s+([A-Z]{2,})/, // "DON JOHN"
        /([A-Z]+,)\s*([A-Z]+)/, // "LAST, FIRST"
        /([A-Z][a-z]+)\s+([A-Z][a-z]+)/, // "John Doe"
    ];

    for (const pattern of namePatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            const parts = match[0].split(/[\s,]+/).filter((p) => p.length > 1);
            if (parts.length >= 2) {
                // Usually first name comes before last name
                data.firstName = parts[0].trim();
                data.lastName = parts[parts.length - 1].trim();
                break;
            }
        }
    }

    // Extract Date of Birth (DOB/Birth Date)
    // Patterns: "DOB 01/01/1990", "BIRTH DATE 01-01-1990", "01/01/1990"
    const dobPatterns = [
        /(?:dob|birth\s*date|birthday|b\.?d\.?)\s*[:]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2})/, // MM/DD/YY
    ];

    for (const pattern of dobPatterns) {
        const match = text.match(pattern);
        if (match) {
            const dateStr = match[1];
            // Try to parse and format date
            const parts = dateStr.split(/[\/\-\.]/);
            if (parts.length === 3) {
                let month = parts[0];
                let day = parts[1];
                let year = parts[2];

                // If year is 2 digits, assume 19xx or 20xx
                if (year.length === 2) {
                    const yearNum = parseInt(year);
                    year = yearNum > 50 ? `19${year}` : `20${year}`;
                }

                // Format as YYYY-MM-DD
                if (month.length === 1) month = `0${month}`;
                if (day.length === 1) day = `0${day}`;
                data.birthDate = `${year}-${month}-${day}`;
                break;
            }
        }
    }

    // Extract Gender/Sex
    const genderPatterns = [/(?:sex|gender)\s*[:]?\s*(male|female|m|f)/i, /\b(male|female|m|f)\b/i];

    for (const pattern of genderPatterns) {
        const match = text.match(pattern);
        if (match) {
            const genderStr = match[1].toLowerCase();
            if (genderStr === "m" || genderStr === "male") {
                data.gender = "Male";
            } else if (genderStr === "f" || genderStr === "female") {
                data.gender = "Female";
            }
            break;
        }
    }

    // Extract ID Number (DLN - Driver's License Number)
    // Patterns: "DLN", "ID", "LICENSE", "DL NO", usually followed by alphanumeric
    const idPatterns = [
        /(?:dln|dl\s*#|driver\s*license|license\s*#|id\s*#|id\s*number)\s*[:]?\s*([A-Z0-9]{5,})/i,
        /\b([A-Z]{1,2}\d{6,}|\d{8,})\b/, // Common DL formats
    ];

    for (const pattern of idPatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            data.idNumber = match[1].trim();
            break;
        }
    }

    // Extract Address
    // Look for patterns like "ADDRESS", "ADDR", or typical address format
    const addressPatterns = [
        /(?:address|addr|residence)\s*[:]?\s*([0-9]+\s+[A-Z0-9\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|circle|cir|court|ct)[A-Z0-9\s,]*)/i,
        /([0-9]+\s+[A-Z][A-Z0-9\s]{10,})/i, // Address-like format
    ];

    for (const pattern of addressPatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            data.address = match[1].trim();
            break;
        }
    }

    // Extract Phone Number
    const phonePatterns = [/(?:phone|tel|mobile|cell)\s*[:]?\s*([\+]?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i, /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/];

    for (const pattern of phonePatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            data.phone = normalizeUSPhoneToE164(match[1]);
            break;
        }
    }

    // Extract Email
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/;
    const emailMatch = ocrText.match(emailPattern);
    if (emailMatch) {
        data.email = emailMatch[1];
    }

    // If we couldn't find names using patterns, try to extract from first few lines
    if (!data.firstName && !data.lastName && lines.length > 0) {
        // Usually name is in first 2-3 lines
        const potentialNameLines = lines.slice(0, 3);
        for (const line of potentialNameLines) {
            const words = line.split(/\s+/).filter((w) => w.length > 1);
            if (words.length >= 2 && words.every((w) => /^[A-Z]+$/.test(w))) {
                data.firstName = words[0];
                data.lastName = words[words.length - 1];
                break;
            }
        }
    }

    return data;
}
