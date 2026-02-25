import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Configure dayjs plugins
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Convert date to relative time (e.g. "just now", "2 minutes ago")
 * @param dateString - Date as string (e.g. "2025-10-16T20:14:13.000000Z")
 * @returns relative time string
 */
export const getRelativeTime = (dateString: string): string => {
    if (!dateString) return "";

    // Parse UTC date and convert to local timezone
    const date = dayjs.utc(dateString).local();
    const now = dayjs();

    // If date is in the future
    if (date.isAfter(now)) {
        return "just now";
    }

    // Compute difference in seconds
    const diffInSeconds = now.diff(date, "second");

    // If less than 60 seconds
    if (diffInSeconds < 60) {
        return "just now";
    }

    // If less than 2 minutes
    if (diffInSeconds < 120) {
        return "1 minute ago";
    }

    // If less than 60 minutes
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minutes ago`;
    }

    // If less than 24 hours
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    // If less than 7 days
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    // If less than 30 days
    if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }

    // If less than 365 days
    if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} month${months > 1 ? "s" : ""} ago`;
    }

    // If more than one year
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? "s" : ""} ago`;
};

/**
 * Convert date to relative time using dayjs
 * @param dateString - Date as string
 * @returns relative time string
 */
export const getRelativeTimeWithDayjs = (dateString: string): string => {
    if (!dateString) return "";

    // Parse UTC date and convert to local timezone
    const date = dayjs.utc(dateString).local();
    return date.fromNow();
};

/**
 * Format date for display (e.g. "December 2, 2025")
 * @param dateString - Date as string (e.g. "2025-12-02T19:09:49.000000Z")
 * @param format - Desired format (default: "MMMM D, YYYY")
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, format: string = "MMMM D, YYYY"): string => {
    if (!dateString) return "";

    // Parse UTC date and convert to local timezone
    const date = dayjs.utc(dateString).local();
    if (!date.isValid()) return "";

    return date.format(format);
};

/**
 * Short readable date for document/badge (e.g. "12 Feb 2024") – the day the image was taken.
 * Format: day month year, full year, unambiguous.
 */
export const getShortDate = (dateString: string): string => {
    return formatDate(dateString, "D MMM YYYY");
};
