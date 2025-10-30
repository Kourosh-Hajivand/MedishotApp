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

export function normalizeUSPhoneToE164(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length >= 10) {
        const clean = digits.slice(-10);
        return `+1${clean}`;
    }
    return value;
}
