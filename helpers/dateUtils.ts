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
 */
export function formatTime(timeStr?: string | null): string {
  if (!timeStr) return '-';
  try {
    const parts = timeStr.split(':');
    const [hh, mm] = parts;
    return `${hh}:${mm ?? '00'}`;
  } catch {
    return timeStr;
  }
}

/**
 * Formats a date range from start to end dates
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return '-';
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startStr = startDate.toLocaleDateString('es-ES');
    const endStr = endDate.toLocaleDateString('es-ES');
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

