/**
 * Public surface of the auth feature. Import from '@/features/auth' rather
 * than reaching into internal files.
 */
export { useLogin } from './hooks/use-login';
export { useSendOtp, useVerifyOtp } from './hooks/use-otp-login';
export { useLogout } from './hooks/use-logout';

export {
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  phoneSchema,
} from './schemas/auth.schema';
export type {
  LoginValues,
  SendOtpValues,
  VerifyOtpValues,
} from './schemas/auth.schema';

export type { AuthMethod, OtpStep } from './types/auth.types';
