/**
 * BillVyApp business timezone resolution.
 *
 * Franchise preferences.timezone
 *   → PlatformSettings.timezone (via /auth/me fallback already applied server-side)
 *   → Asia/Kolkata
 *
 * Salon-level timezone is reserved for a future extension.
 */

export const DEFAULT_BUSINESS_TIMEZONE = 'Asia/Kolkata';

let activeBusinessTimezone = DEFAULT_BUSINESS_TIMEZONE;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function resolveBusinessTimezone(input: {
  franchiseTimezone?: string | null;
  platformTimezone?: string | null;
  salonTimezone?: string | null;
}): string {
  for (const candidate of [
    input.salonTimezone,
    input.franchiseTimezone,
    input.platformTimezone,
    DEFAULT_BUSINESS_TIMEZONE,
  ]) {
    const trimmed = candidate?.trim();
    if (trimmed && isValidTimeZone(trimmed)) return trimmed;
  }
  return DEFAULT_BUSINESS_TIMEZONE;
}

/** Module-level active TZ used by formatters (set after auth bootstrap). */
export function setBusinessTimezone(timeZone: string | null | undefined): void {
  const trimmed = timeZone?.trim();
  activeBusinessTimezone =
    trimmed && isValidTimeZone(trimmed) ? trimmed : DEFAULT_BUSINESS_TIMEZONE;
}

export function getBusinessTimezone(): string {
  return activeBusinessTimezone;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnlyString(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const match = DATE_ONLY_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Calendar YYYY-MM-DD for an instant in the business timezone. */
export function calendarDateInTimeZone(
  timeZone: string,
  instant: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return 'Invalid Date';
  return `${year}-${month}-${day}`;
}

export function todayBusinessDateOnly(
  timeZone: string = getBusinessTimezone(),
): string {
  return calendarDateInTimeZone(timeZone, new Date());
}

export function startOfMonthBusinessDateOnly(
  timeZone: string = getBusinessTimezone(),
): string {
  const today = todayBusinessDateOnly(timeZone);
  return `${today.slice(0, 7)}-01`;
}

export function addCalendarDays(dateOnly: string, days: number): string {
  const match = DATE_ONLY_RE.exec(dateOnly);
  if (!match) throw new Error(`Invalid date-only value: ${dateOnly}`);
  const next = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

export function startOfYearBusinessDateOnly(
  timeZone: string = getBusinessTimezone(),
): string {
  const today = todayBusinessDateOnly(timeZone);
  return `${today.slice(0, 4)}-01-01`;
}
