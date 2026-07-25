/**
 * Date/time utilities for the Asia/Karachi timezone.
 * All timestamps are stored as UTC in MongoDB and formatted here for display.
 */

const TIMEZONE = "Asia/Karachi";

/**
 * Format a Date object as a human-readable date string in Karachi time.
 * e.g. "25 Jul 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Format a Date object as date + time in Karachi time.
 * e.g. "25 Jul 2026, 3:45 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Get the start of the current day in Karachi time, returned as a UTC Date.
 */
export function getKarachiDayStart(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(date); // "YYYY-MM-DD"
  return new Date(`${dateStr}T00:00:00+05:00`);
}

/**
 * Get the end of the current day in Karachi time, returned as a UTC Date.
 */
export function getKarachiDayEnd(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(date); // "YYYY-MM-DD"
  return new Date(`${dateStr}T23:59:59+05:00`);
}

/**
 * Get start of the current month in Karachi time.
 */
export function getKarachiMonthStart(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(date).split("-");
  return new Date(`${year}-${month}-01T00:00:00+05:00`);
}

/**
 * Parse a "YYYY-MM-DD" string (from query params) into a UTC Date at midnight Karachi.
 */
export function parseKarachiDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:00`);
}

/**
 * Format a date to "YYYY-MM-DD" in Karachi timezone (useful for grouping).
 */
export function toKarachiDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
