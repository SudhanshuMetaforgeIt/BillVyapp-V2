import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Display formatting helpers. Presentation only - never use these to prepare
 * values for the API, which expects raw ISO strings and plain numbers.
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

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy') : '-';
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy, h:mm a') : '-';
}

export function formatRelative(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : '-';
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
