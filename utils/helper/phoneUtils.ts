/**
 * Phone Number Utilities
 * Comprehensive functions for handling US phone numbers in E.164 format
 */

/**
 * Formats phone digits for display: (415) 555-2671
 * @param digits - Raw digits only (0-9), max 10 digits
 * @returns Formatted string for display
 */
export const formatPhoneDisplay = (digits: string): string => {
    if (!digits || digits.length === 0) return "";
    // Remove any non-digit characters
    const cleaned = digits.replace(/\D/g, "");
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
};

/**
 * Extracts raw digits (0-9) from any phone number format
 * @param value - Phone number in any format (E.164, formatted, raw, etc.)
 * @returns Raw digits only (max 10 digits)
 */
export const extractPhoneDigits = (value: string | null | undefined): string => {
    if (!value || typeof value !== "string") return "";
    
    // If value starts with +1, extract digits after +1
    if (value.startsWith("+1")) {
        return value.slice(2).replace(/\D/g, "").slice(0, 10);
    }
    
    // If value starts with just 1 (without +), extract after 1
    if (value.length > 10 && value.replace(/\D/g, "").startsWith("1") && value.replace(/\D/g, "").length === 11) {
        return value.replace(/\D/g, "").slice(1, 11);
    }
    
    // Otherwise, extract all digits (for formatted values like (222) 222-2231)
    return value.replace(/\D/g, "").slice(0, 10);
};

/**
 * Converts any phone number format to E.164 format (+1XXXXXXXXXX)
 * This is the ONLY function you should use when sending phone numbers to backend
 * 
 * @param value - Phone number in any format:
 *   - E.164: "+12222222231"
 *   - Formatted: "(222) 222-2231"
 *   - Raw digits: "2222222231"
 *   - With country code: "12222222231"
 *   - Other formats: "+1 (222) 222-2231", "1-222-222-2231", etc.
 * 
 * @returns E.164 format string "+1XXXXXXXXXX" (12 characters) or empty string if invalid
 * 
 * @example
 * toE164("(222) 222-2231") => "+12222222231"
 * toE164("+12222222231") => "+12222222231"
 * toE164("2222222231") => "+12222222231"
 * toE164("+1 (222) 222-2231") => "+12222222231"
 * toE164("123") => "" (invalid - less than 10 digits)
 * toE164(null) => "" (invalid)
 */
export const toE164 = (value: string | null | undefined): string => {
    if (!value || typeof value !== "string") return "";
    
    const digits = extractPhoneDigits(value);
    
    // Must have exactly 10 digits to be valid
    if (digits.length !== 10) return "";
    
    // Return in E.164 format
    return "+1" + digits;
};

/**
 * Validates if a phone number is in valid E.164 format
 * @param value - Phone number to validate
 * @returns true if valid E.164 format, false otherwise
 */
export const isValidE164 = (value: string | null | undefined): boolean => {
    if (!value || typeof value !== "string") return false;
    // E.164 format: +1 followed by exactly 10 digits
    return /^\+1\d{10}$/.test(value);
};

/**
 * Normalizes phone number for display and storage
 * - Extracts digits from any format
 * - Returns E.164 if valid (10 digits), otherwise empty string
 * 
 * @param value - Phone number in any format
 * @returns E.164 format or empty string
 */
export const normalizePhoneNumber = (value: string | null | undefined): string => {
    return toE164(value);
};

/**
 * Converts E.164 format to formatted display string
 * @param e164Value - Phone number in E.164 format (e.g., "+12222222231")
 * @returns Formatted string (e.g., "(222) 222-2231") or empty string if invalid
 */
export const e164ToDisplay = (e164Value: string | null | undefined): string => {
    if (!e164Value || typeof e164Value !== "string") return "";
    
    // Extract digits from E.164 format
    const digits = extractPhoneDigits(e164Value);
    
    // Format for display
    return formatPhoneDisplay(digits);
};
