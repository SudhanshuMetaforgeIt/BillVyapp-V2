import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

import {
  getBusinessTimezone,
  isDateOnlyString,
} from '@/lib/business-timezone';

/**
 * Display formatting helpers. Presentation only - never use these to prepare
 * values for the API, which expects raw ISO strings and plain numbers.
 *
 * Instant timestamps are formatted in the resolved business timezone
 * (never the browser/device timezone).
 * Date-only YYYY-MM-DD values are rendered without timezone conversion.
 */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const INR_COMPACT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const NUMBER_IN = new Intl.NumberFormat('en-IN');

/** Backend money fields are Prisma Decimals, serialised as strings. */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(amount) ? '-' : INR.format(amount);
}

/** Compact INR for charts and dense KPI contexts (e.g. ₹8.45L). */
export function formatCompactCurrency(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '-';

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

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(amount) ? '-' : NUMBER_IN.format(amount);
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

function formatCalendarDateLabel(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Noon UTC avoids DST edge cases when labeling a pure calendar date.
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(probe);
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
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(instant);
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
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(instant);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
      hour12: true,
      timeZone: 'UTC',
    }).format(probe);
  }
  const instant = toInstant(value);
  if (!instant) return '-';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(instant);
}

export function formatRelative(value: Date | string | null | undefined): string {
  const instant = toInstant(value);
  return instant ? formatDistanceToNow(instant, { addSuffix: true }) : '-';
}

/**
 * Phone numbers are stored as bare 10 digits (no country code). Add the +91
 * only for display.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  return /^[0-9]{10}$/.test(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

export function formatFullName(person: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || '-';
}
