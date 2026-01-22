import { format } from 'date-fns';

/**
 * Format a deadline for display in the UI
 * Converts ISO format (YYYY-MM-DD) or any date string to readable format
 * @param deadline - ISO date string (e.g., "2026-02-12")
 * @returns Formatted date (e.g., "Feb 12, 2026")
 */
export const formatDeadlineForDisplay = (deadline: string): string => {
    try {
        return format(new Date(deadline), 'MMM d, yyyy');
    } catch (e) {
        return deadline; // Fallback to original if parsing fails
    }
};

/**
 * Format a Date object for storage
 * @param date - JavaScript Date object
 * @returns ISO format date string (e.g., "2026-02-12")
 */
export const formatDeadlineForStorage = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * Normalize any deadline string to ISO format
 * Handles both ISO format and formatted strings
 * @param deadline - Any date string
 * @returns Normalized ISO format (e.g., "2026-02-12")
 */
export const normalizeDeadline = (deadline: string): string => {
    try {
        return new Date(deadline).toISOString().split('T')[0];
    } catch (e) {
        return deadline;
    }
};
