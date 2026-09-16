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

/** Backend money fields are Prisma Decimals, serialised as strings. */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(amount) ? '-' : INR.format(amount);
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
