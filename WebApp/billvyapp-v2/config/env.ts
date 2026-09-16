/**
 * Single place where environment variables enter the application.
 *
 * Next.js inlines NEXT_PUBLIC_* at build time, so these must be referenced by
 * their full literal name - destructuring `process.env` breaks the inlining.
 */

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const env = {
  apiUrl,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;

export type Env = typeof env;
