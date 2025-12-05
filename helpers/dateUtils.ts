/**
 * Date formatting and manipulation utilities
 */

/**
 * Formats a date string to DD/MM/YYYY format
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const onlyDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = onlyDate.split('-');
    if (parts.length !== 3) return dateStr;
    const [yy, mm, dd] = parts;
    return `${dd}/${mm}/${yy}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats a time string to HH:MM format
 * Handles both "HH:mm" and "HH:mm:ss+00" formats
 */
export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '-';
  try {
    // Handle both "HH:mm" and "HH:mm:ss+00" formats
    const timeOnly = timeStr.includes('+') ? timeStr.split('+')[0] : timeStr;
    const parts = timeOnly.split(':');
    const [hh, mm] = parts;
    return `${hh}:${mm ?? '00'}`;
  } catch {
    return timeStr;
  }
}

/**
 * Formats a date string to DD/MM/YYYY format, returning empty string if no date
 * Used in home.tsx where empty string is preferred over '-'
 */
export function formatDateOrEmpty(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const onlyDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = onlyDate.split('-');
    if (parts.length !== 3) return dateStr;
    const [yy, mm, dd] = parts;
    return `${dd}/${mm}/${yy}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formats a time string to HH:MM format, returning empty string if no time
 * Used in home.tsx where empty string is preferred over '-'
 */
export function formatTimeOrEmpty(timeStr?: string | null): string {
  if (!timeStr) return '';
  try {
    // Handle both "HH:mm" and "HH:mm:ss+00" formats
    const timeOnly = timeStr.includes('+') ? timeStr.split('+')[0] : timeStr;
    const parts = timeOnly.split(':');
    const [hh, mm] = parts;
    return `${hh}:${mm ?? '00'}`;
  } catch {
    return timeStr;
  }
}

/**
 * Formats a date range from start to end dates
 * Parses dates manually to avoid timezone issues
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return '-';
  try {
    // Parse dates manually to avoid timezone issues
    // Dates come as "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.sssZ"
    const formatDateManual = (dateStr: string): string => {
      const onlyDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = onlyDate.split('-');
      if (parts.length !== 3) return dateStr;
      const [yy, mm, dd] = parts;
      // Format as DD/MM/YYYY directly without timezone conversion
      return `${dd}/${mm}/${yy}`;
    };

    const startStr = formatDateManual(start);
    const endStr = formatDateManual(end);
    return `${startStr} - ${endStr}`;
  } catch {
    return `${start} - ${end}`;
  }
}

/**
 * Safely parses a date string, returning a valid Date object or a fallback
 */
export function parseDateSafe(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date();
    return date;
  } catch {
    return new Date();
  }
}

/**
 * Checks if a date string represents a past date
 */
export function isDatePast(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    return date < new Date();
  } catch {
    return false;
  }
}

/**
 * Checks if a date string represents a future date
 */
export function isDateFuture(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    return date > new Date();
  } catch {
    return false;
  }
}

