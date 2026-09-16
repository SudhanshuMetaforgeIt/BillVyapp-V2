import type { AuthSession, AuthUser } from '@/types/user.types';

/**
 * Feature-local auth types. The shared identity shapes (AuthUser,
 * AuthSession) live in types/ because navigation and permissions need them too.
 */

export type { AuthSession, AuthUser };

/** Which credential the user is signing in with. */
export type AuthMethod = 'password' | 'otp';

/** Drives the two-step OTP form: enter number, then enter code. */
export type OtpStep = 'request-code' | 'verify-code';
