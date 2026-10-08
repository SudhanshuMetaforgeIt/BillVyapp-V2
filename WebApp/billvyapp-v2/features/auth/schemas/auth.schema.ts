import { cleanPhoneInput, isValidPhoneInput } from '@/lib/phone';
import { z } from 'zod';

/**
 * Validation for the auth forms.
 *
 * These mirror the backend DTOs so the user sees errors before a round trip.
 * They are a UX layer only: the NestJS ValidationPipe re-validates everything.
 */

/**
 * Local input inherits the franchise country; international input keeps its prefix.
 */
export const phoneSchema = z
  .string()
  .refine(
    isValidPhoneInput,
    'Enter 10 local digits or an international number',
  );

/**
 * Staff/admin sign-in. Backend LoginDto is email + password only.
 * Phone is optional UI (matches the login design) and is not sent to the API.
 */
export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidPhoneInput(value), {
      message: 'Enter 10 local digits or an international number',
    }),
  password: z.string().min(1, 'Password is required').max(128),
});

/**
 * Cleans phone input without removing an existing country prefix.
 */
export function normalizeIndianPhone(value: string): string {
  return cleanPhoneInput(value);
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
      .refine((value) => isValidPhoneInput(value), {
        message: 'Enter 10 local digits or an international number',
      }),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
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
