/**
 * Public surface of the auth feature. Import from '@/features/auth' rather
 * than reaching into internal files.
 */
export { useLogin } from './hooks/use-login';
export { useRegister } from './hooks/use-register';
export { useSendOtp, useVerifyOtp } from './hooks/use-otp-login';
export { useLogout } from './hooks/use-logout';
export { useAuthPageEntrance } from './hooks/use-auth-page-entrance';

export { LoginPageView } from './components/login-page-view';
export { RegisterPageView } from './components/register-page-view';

export {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  phoneSchema,
  normalizeIndianPhone,
} from './schemas/auth.schema';
export type {
  LoginValues,
  RegisterValues,
  SendOtpValues,
  VerifyOtpValues,
} from './schemas/auth.schema';

export type { AuthMethod, OtpStep } from './types/auth.types';
