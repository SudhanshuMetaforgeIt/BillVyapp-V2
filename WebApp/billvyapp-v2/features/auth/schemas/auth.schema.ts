import { z } from 'zod';

/**
 * Validation for the auth forms.
 *
 * These mirror the backend DTOs so the user sees errors before a round trip.
 * They are a UX layer only: the NestJS ValidationPipe re-validates everything.
 */

/**
 * Indian mobile numbers are stored as exactly 10 digits with no +91 prefix,
 * matching users.phone in the database.
 */
export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, 'Enter a 10-digit mobile number without +91');

/**
 * Staff/admin sign-in. Backend LoginDto is email + password only.
 * Phone is optional UI (matches the login design) and is not sent to the API.
 */
export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        /^[0-9]{10}$/.test(value) ||
        /^\+91\s?[0-9]{10}$/.test(value),
      {
        message:
          'Enter a 10-digit mobile number, optionally prefixed with +91',
      },
    ),
  password: z.string().min(1, 'Password is required').max(128),
});

/**
 * Normalises UI phone input to the 10-digit form the backend stores.
 */
export function normalizeIndianPhone(value: string): string {
  const trimmed = value.trim();
  if (/^\+91\s?[0-9]{10}$/.test(trimmed)) {
    return trimmed.replace(/^\+91\s?/, '');
  }
  return trimmed;
}

/**
 * Public customer registration. No role field — CUSTOMER is assigned
 * exclusively by the NestJS register endpoint.
 */
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name must be at most 100 characters'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(100, 'Last name must be at most 100 characters'),
    email: z.email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .min(1, 'Phone number is required')
      .refine(
        (value) =>
          /^[0-9]{10}$/.test(normalizeIndianPhone(value)) ||
          /^\+91\s?[0-9]{10}$/.test(value),
        {
          message:
            'Enter a 10-digit mobile number, optionally prefixed with +91',
        },
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^[0-9]{6}$/, 'Enter the 6-digit code'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type SendOtpValues = z.infer<typeof sendOtpSchema>;
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;
