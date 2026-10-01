/**
 * Temporal contract for BillVyApp V2:
 *
 * - Instants (createdAt, paymentDate, audit timestamps, …) are persisted and
 *   exchanged as UTC. The MariaDB pool sets session time_zone to UTC.
 * - Calendar dates (YYYY-MM-DD) are timezone-free labels; interpret them in the
 *   business timezone when converting to UTC query bounds.
 * - Appointment date/time fields remain salon-local DATE/TIME values.
 * - billDate is a DATE_ONLY business-calendar sentinel stored in DATETIME
 *   (schema unchanged). It is not an absolute transaction instant. Canonical
 *   writes use UTC midnight of the YYYY-MM-DD label so the calendar day is
 *   recoverable without timezone conversion. Do not format billDate with
 *   generic instant formatters.
 *
 * Historical DATETIME rows are never rewritten by this module.
 */

export const DEFAULT_BUSINESS_TIMEZONE = 'Asia/Kolkata';

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type BusinessDayUtcRange = {
  /** Inclusive start instant (UTC). */
  startUtc: Date;
  /** Exclusive end instant (UTC) — start of the next business calendar day. */
  endUtcExclusive: Date;
};

export function resolveBusinessTimezone(input: {
  franchiseTimezone?: string | null;
  platformTimezone?: string | null;
  /** Reserved for a future salon-level timezone column. */
  salonTimezone?: string | null;
}): string {
  const candidates = [
    input.salonTimezone,
    input.franchiseTimezone,
    input.platformTimezone,
    DEFAULT_BUSINESS_TIMEZONE,
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && isValidTimeZone(trimmed)) {
      return trimmed;
    }
  }
  return DEFAULT_BUSINESS_TIMEZONE;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

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

/**
 * Calendar YYYY-MM-DD for an instant as seen in `timeZone`.
 * Does not shift date-only strings — pass them through unchanged.
 */
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
  if (!year || !month || !day) {
    throw new Error(`Unable to derive calendar date for timezone ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}

/**
 * UTC instant of local wall time `YYYY-MM-DDTHH:mm:ss` in `timeZone`.
 */
export function zonedLocalTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(utcGuess))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const asLocalUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    millisecond,
  );

  const offsetMs = asLocalUtc - utcGuess;
  return new Date(utcGuess - offsetMs);
}

/** Start of the business calendar day (local midnight) as a UTC instant. */
export function calendarDateStartUtc(
  dateOnly: string,
  timeZone: string,
): Date {
  if (!isDateOnlyString(dateOnly)) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }
  const [, y, m, d] = DATE_ONLY_RE.exec(dateOnly)!;
  return zonedLocalTimeToUtc(
    timeZone,
    Number(y),
    Number(m),
    Number(d),
    0,
    0,
    0,
    0,
  );
}

/** Half-open UTC range covering one business calendar day. */
export function businessDayUtcRange(
  dateOnly: string,
  timeZone: string,
): BusinessDayUtcRange {
  const startUtc = calendarDateStartUtc(dateOnly, timeZone);
  const [, y, m, d] = DATE_ONLY_RE.exec(dateOnly)!;
  const next = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + 1));
  const nextDateOnly = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  const endUtcExclusive = calendarDateStartUtc(nextDateOnly, timeZone);
  return { startUtc, endUtcExclusive };
}

/**
 * Inclusive calendar range → half-open UTC instant range.
 * When `dateTo` is omitted, uses `dateFrom` as a single day.
 * When `dateFrom` is omitted, returns only an upper bound.
 */
export function businessCalendarRangeToUtc(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  timeZone: string,
): { gte?: Date; lt?: Date } {
  const from = dateFrom?.trim() || undefined;
  const to = dateTo?.trim() || undefined;

  if (!from && !to) return {};

  if (from && to) {
    if (!isDateOnlyString(from) || !isDateOnlyString(to)) {
      throw new Error('dateFrom/dateTo must be YYYY-MM-DD');
    }
    if (from > to) {
      throw new Error('dateFrom must be on or before dateTo');
    }
    const start = businessDayUtcRange(from, timeZone).startUtc;
    const end = businessDayUtcRange(to, timeZone).endUtcExclusive;
    return { gte: start, lt: end };
  }

  if (from) {
    const day = businessDayUtcRange(from, timeZone);
    return { gte: day.startUtc, lt: day.endUtcExclusive };
  }

  // dateTo only
  const day = businessDayUtcRange(to!, timeZone);
  return { lt: day.endUtcExclusive };
}

/** First calendar day of the month containing `dateOnly`. */
export function startOfMonthDateOnly(dateOnly: string): string {
  if (!isDateOnlyString(dateOnly)) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }
  return `${dateOnly.slice(0, 7)}-01`;
}

/** Add calendar days to a YYYY-MM-DD value (UTC-calendar arithmetic on the label). */
export function addCalendarDays(dateOnly: string, days: number): string {
  if (!isDateOnlyString(dateOnly)) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }
  const [, y, m, d] = DATE_ONLY_RE.exec(dateOnly)!;
  const next = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Parse a date-only API label for MySQL DATE columns / DATE_ONLY sentinels.
 * Stores as UTC midnight of that calendar label (the label has no zone).
 */
export function parseDateOnlyUtc(dateOnly: string): Date {
  if (!isDateOnlyString(dateOnly)) {
    throw new Error(`Invalid date-only value: ${dateOnly}`);
  }
  const [, y, m, d] = DATE_ONLY_RE.exec(dateOnly)!;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

export function formatDateOnlyUtc(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function isUtcMidnight(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

/**
 * Serialize billDate (DATE_ONLY sentinel in DATETIME) to YYYY-MM-DD.
 * Never applies browser/device timezone. Canonical UTC-midnight rows keep the
 * UTC date label. Non-midnight rows (compat with earlier Phase-2 writes that
 * stored business-day start instants) decode via `timeZone`.
 */
export function formatBillDateApi(value: Date, timeZone: string): string {
  if (isUtcMidnight(value)) {
    return formatDateOnlyUtc(value);
  }
  return calendarDateInTimeZone(timeZone, value);
}
