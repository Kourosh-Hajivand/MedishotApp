export function formatNumber(num: string) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const usPhoneRegex =
  /^\(?([0-9]{3})\)?[-.●\s]?([0-9]{3})[-.●\s]?([0-9]{4})$/;

export function formatUSPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').substring(0, 10);
  const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (!match) return digits;
  const [, area, prefix, line] = match;
  if (line) return `(${area}) ${prefix}-${line}`;
  if (prefix) return `(${area}) ${prefix}`;
  if (area) return `(${area}`;
  return '';
}
