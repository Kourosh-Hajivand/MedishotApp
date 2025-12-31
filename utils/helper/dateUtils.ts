import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// تنظیم plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * تبدیل تاریخ به relative time (مثل "just now", "2 minutes ago")
 * @param dateString - تاریخ به صورت string (مثل "2025-10-16T20:14:13.000000Z")
 * @returns relative time string
 */
export const getRelativeTime = (dateString: string): string => {
    if (!dateString) return "";

    // Parse UTC date and convert to local timezone
    const date = dayjs.utc(dateString).local();
    const now = dayjs();

    // اگر تاریخ در آینده باشد
    if (date.isAfter(now)) {
        return "just now";
    }

    // محاسبه تفاوت به ثانیه
    const diffInSeconds = now.diff(date, "second");

    // اگر کمتر از 60 ثانیه باشد
    if (diffInSeconds < 60) {
        return "just now";
    }

    // اگر کمتر از 2 دقیقه باشد
    if (diffInSeconds < 120) {
        return "1 minute ago";
    }

    // اگر کمتر از 60 دقیقه باشد
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minutes ago`;
    }

    // اگر کمتر از 24 ساعت باشد
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    // اگر کمتر از 7 روز باشد
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    // اگر کمتر از 30 روز باشد
    if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }

    // اگر کمتر از 365 روز باشد
    if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} month${months > 1 ? "s" : ""} ago`;
    }

    // اگر بیشتر از یک سال باشد
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? "s" : ""} ago`;
};

/**
 * تبدیل تاریخ به relative time با استفاده از dayjs
 * @param dateString - تاریخ به صورت string
 * @returns relative time string
 */
export const getRelativeTimeWithDayjs = (dateString: string): string => {
    if (!dateString) return "";

    // Parse UTC date and convert to local timezone
    const date = dayjs.utc(dateString).local();
    return date.fromNow();
};

/**
 * تبدیل تاریخ به فرمت خوانا (مثل "December 2, 2025")
 * @param dateString - تاریخ به صورت string (مثل "2025-12-02T19:09:49.000000Z")
 * @param format - فرمت دلخواه (پیش‌فرض: "MMMM D, YYYY")
 * @returns تاریخ فرمت شده
 */
export const formatDate = (dateString: string, format: string = "MMMM D, YYYY"): string => {
    if (!dateString) return "";

    // Parse UTC date and convert to local timezone
    const date = dayjs.utc(dateString).local();
    if (!date.isValid()) return "";

    return date.format(format);
};
