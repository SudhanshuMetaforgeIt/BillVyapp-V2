import { normalizePhone } from '@/lib/phone';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { getBusinessRegion } from '@/lib/business-region';

import { getBusinessTimezone, isDateOnlyString } from '@/lib/business-timezone';

/**
 * Display formatting helpers. Presentation only - never use these to prepare
 * values for the API, which expects raw ISO strings and plain numbers.
 *
 * Instant timestamps are formatted in the resolved business timezone
 * (never the browser/device timezone).
 * Date-only YYYY-MM-DD values are rendered without timezone conversion.
 */

const INR_COMPACT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 2,
});

/** Backend money fields are Prisma Decimals, serialised as strings. */
export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string,
): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = typeof value === 'string' ? Number(value) : value;
  const region = currency
    ? { currency, locale: currency === 'USD' ? 'en-US' : 'en-IN' }
    : getBusinessRegion();
  return Number.isNaN(amount)
    ? '-'
    : new Intl.NumberFormat(region.locale, {
        style: 'currency',
        currency: region.currency,
        minimumFractionDigits: 2,
      }).format(amount);
}

/** Compact INR for charts and dense KPI contexts (e.g. ₹8.45L). */
export function formatCompactCurrency(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '-';
  const region = getBusinessRegion();
  if (region.currency === 'USD')
    return new Intl.NumberFormat(region.locale, {
      style: 'currency',
      currency: region.currency,
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(amount);

  // Prefer lakhs-style labels for Indian SaaS dashboards when ≥ 1L.
  if (Math.abs(amount) >= 100_000) {
    const lakhs = amount / 100_000;
    const formatted = lakhs.toLocaleString('en-IN', {
      maximumFractionDigits: lakhs >= 10 ? 1 : 2,
    });
    return `₹${formatted}L`;
  }

  return INR_COMPACT.format(amount);
}

export function formatNumber(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(amount)
    ? '-'
    : new Intl.NumberFormat(getBusinessRegion().locale).format(amount);
}

export function formatPercentChange(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function toInstant(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (typeof value === 'string' && isDateOnlyString(value)) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

function dateOptions(): Intl.DateTimeFormatOptions {
  const f = getBusinessRegion().dateFormat;
  return {
    day: '2-digit',
    month: f === 'DD MMM YYYY' ? 'short' : '2-digit',
    year: 'numeric',
  };
}
function formatCalendarDateLabel(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Noon UTC avoids DST edge cases when labeling a pure calendar date.
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat(
    getBusinessRegion().dateFormat === 'YYYY-MM-DD'
      ? 'sv-SE'
      : getBusinessRegion().dateFormat === 'MM/DD/YYYY'
        ? 'en-US'
        : 'en-GB',
    {
      ...dateOptions(),
      timeZone: 'UTC',
    },
  ).format(probe);
}

/**
 * Format a calendar date (YYYY-MM-DD) or an instant as a date label.
 * Instants use the business timezone; date-only values are not shifted.
 */
export function formatDate(
  value: Date | string | null | undefined,
  timeZone: string = getBusinessTimezone(),
): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && isDateOnlyString(value)) {
    return formatCalendarDateLabel(value);
  }
  const instant = toInstant(value);
  if (!instant) return '-';
  return new Intl.DateTimeFormat(
    getBusinessRegion().dateFormat === 'YYYY-MM-DD'
      ? 'sv-SE'
      : getBusinessRegion().dateFormat === 'MM/DD/YYYY'
        ? 'en-US'
        : 'en-GB',
    {
      ...dateOptions(),
      timeZone,
    },
  ).format(instant);
}

/**
 * Format an instant in the business timezone.
 * Example: 2026-10-01T07:15:00.000Z → "01 Oct 2026, 12:45 pm" in Asia/Kolkata.
 */
export function formatDateTime(
  value: Date | string | null | undefined,
  timeZone: string = getBusinessTimezone(),
): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && isDateOnlyString(value)) {
    return formatCalendarDateLabel(value);
  }
  const instant = toInstant(value);
  if (!instant) return '-';
  const datePart = new Intl.DateTimeFormat(
    getBusinessRegion().dateFormat === 'YYYY-MM-DD'
      ? 'sv-SE'
      : getBusinessRegion().dateFormat === 'MM/DD/YYYY'
        ? 'en-US'
        : 'en-GB',
    {
      ...dateOptions(),
      timeZone,
    },
  ).format(instant);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: getBusinessRegion().hour12,
    timeZone,
  }).format(instant);
  return `${datePart}, ${timePart}`;
}

/**
 * Format a clock time. HH:mm[:ss] appointment times are passed through without
 * timezone conversion. Instant values use the business timezone.
 */
export function formatTime(
  value: Date | string | null | undefined,
  timeZone: string = getBusinessTimezone(),
): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    const probe = new Date(Date.UTC(1970, 0, 1, h, m, 0));
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: getBusinessRegion().hour12,
      timeZone: 'UTC',
    }).format(probe);
  }
  const instant = toInstant(value);
  if (!instant) return '-';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: getBusinessRegion().hour12,
    timeZone,
  }).format(instant);
}

export function formatRelative(
  value: Date | string | null | undefined,
): string {
  const instant = toInstant(value);
  return instant ? formatDistanceToNow(instant, { addSuffix: true }) : '-';
}

/**
 * Display the stored international number; apply the default to legacy local input.
 */
export function formatPhone(phone: string | null | undefined): string {
  return phone ? normalizePhone(phone) : '-';
}

export function formatFullName(person: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || '-';
}
