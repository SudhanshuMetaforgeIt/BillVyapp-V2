import { z } from 'zod';
import { cleanPhoneInput, isValidPhoneInput } from '@/lib/phone';

// Partial input remains searchable; full numbers are required for creation.
export const customerPhoneInputSchema = z.string().transform(cleanPhoneInput).refine(value => {
  if (/^\d{0,10}$/.test(value) || value === '+') return true;
  if (!/^\+[1-9]\d{0,14}$/.test(value)) return false;
  if (value.startsWith('+91')) return value.length <= 13;
  if (value.startsWith('+1')) return value.length <= 12;
  return true;
}, 'Enter no more than 10 local digits, or include a valid country code.');

export const customerPhoneSchema = customerPhoneInputSchema.refine(
  isValidPhoneInput,
  'Enter a complete 10-digit phone number, or a valid number with country code.',
);

export const customerPhoneSearchSchema = customerPhoneInputSchema.refine(
  value => value.replace(/\D/g, '').length >= 3,
  'Enter at least 3 digits to search.',
);
