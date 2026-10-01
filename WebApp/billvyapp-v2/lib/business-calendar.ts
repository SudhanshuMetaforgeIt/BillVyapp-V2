import {
  addCalendarDays,
  calendarDateInTimeZone,
  getBusinessTimezone,
  startOfMonthBusinessDateOnly,
  startOfYearBusinessDateOnly,
  todayBusinessDateOnly,
} from '@/lib/business-timezone';

/**
 * Business-calendar date ranges for reports/dashboards.
 * Always uses the resolved business timezone — never the browser TZ.
 */

export function businessToday(timeZone = getBusinessTimezone()): string {
  return todayBusinessDateOnly(timeZone);
}

export function businessMonthToDate(timeZone = getBusinessTimezone()): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: startOfMonthBusinessDateOnly(timeZone),
    dateTo: todayBusinessDateOnly(timeZone),
  };
}

export function businessYearToDate(timeZone = getBusinessTimezone()): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: startOfYearBusinessDateOnly(timeZone),
    dateTo: todayBusinessDateOnly(timeZone),
  };
}

export function businessLastNDays(
  daysInclusive: number,
  timeZone = getBusinessTimezone(),
): { dateFrom: string; dateTo: string } {
  const dateTo = todayBusinessDateOnly(timeZone);
  const dateFrom = addCalendarDays(dateTo, -(Math.max(daysInclusive, 1) - 1));
  return { dateFrom, dateTo };
}

export function businessYesterday(timeZone = getBusinessTimezone()): string {
  return addCalendarDays(todayBusinessDateOnly(timeZone), -1);
}

/** Inclusive first/last calendar days of the business month containing today. */
export function businessMonthBounds(timeZone = getBusinessTimezone()): {
  dateFrom: string;
  dateTo: string;
} {
  const today = todayBusinessDateOnly(timeZone);
  const dateFrom = `${today.slice(0, 7)}-01`;
  const [y, m] = dateFrom.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(y, m, 1));
  const dateTo = addCalendarDays(
    `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`,
    -1,
  );
  return { dateFrom, dateTo };
}

/** Monday–Sunday week containing business today (calendar labels). */
export function businessWeekRange(timeZone = getBusinessTimezone()): {
  dateFrom: string;
  dateTo: string;
} {
  const today = todayBusinessDateOnly(timeZone);
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=Sun
  const daysFromMonday = (dow + 6) % 7;
  const dateFrom = addCalendarDays(today, -daysFromMonday);
  return { dateFrom, dateTo: addCalendarDays(dateFrom, 6) };
}

/** Business calendar YYYY-MM-DD for an instant (createdAt, etc.). */
export function businessCalendarDateOfInstant(
  instant: Date | string,
  timeZone = getBusinessTimezone(),
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return calendarDateInTimeZone(timeZone, date);
}

export function isInstantOnBusinessDay(
  instant: Date | string,
  dateOnly: string,
  timeZone = getBusinessTimezone(),
): boolean {
  return businessCalendarDateOfInstant(instant, timeZone) === dateOnly;
}

export function isInstantInBusinessDateRange(
  instant: Date | string,
  dateFrom: string,
  dateTo: string,
  timeZone = getBusinessTimezone(),
): boolean {
  const day = businessCalendarDateOfInstant(instant, timeZone);
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}
