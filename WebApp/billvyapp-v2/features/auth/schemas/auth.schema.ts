import { z } from 'zod';

/**
 * Validation for the auth forms.
 *
 * These mirror the backend DTOs so the user sees errors before a round trip.
 * They are a UX layer only: the NestJS ValidationPipe re-validates everything.
 */

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

/**
 * Indian mobile numbers are stored as exactly 10 digits with no +91 prefix,
 * matching users.phone in the database.
 */
export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, 'Enter a 10-digit mobile number without +91');

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^[0-9]{6}$/, 'Enter the 6-digit code'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SendOtpValues = z.infer<typeof sendOtpSchema>;
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;
