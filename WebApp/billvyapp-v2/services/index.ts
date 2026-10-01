export { api, apiClient, isApiError, setSessionExpiredHandler } from './api-client';
export { authService } from './auth.service';
export type {
  AuthMeUser,
  LoginPayload,
  RegisterPayload,
  SendOtpPayload,
  SendOtpResponse,
  VerifyOtpPayload,
} from './auth.service';
