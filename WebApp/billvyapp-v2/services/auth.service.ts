import type { MessageResponse } from '@/types/api.types';
import type { AuthSession, AuthTokens } from '@/types/user.types';
import { api } from './api-client';
import { tokenStorage } from './token-storage';

/**
 * Auth API surface. One function per backend endpoint, no UI concerns.
 *
 * Endpoints mirror the NestJS AuthController:
 *   POST /auth/login       POST /auth/send-otp   POST /auth/verify-otp
 *   POST /auth/refresh     POST /auth/logout
 */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SendOtpPayload {
  /** Exactly 10 digits, no +91 - matches the backend DTO and users.phone. */
  phone: string;
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
}

export const authService = {
  /** Staff and admin sign-in. Persists the token pair on success. */
  async login(payload: LoginPayload): Promise<AuthSession> {
    const session = await api.post<AuthSession>('/auth/login', payload);
    tokenStorage.set(session);
    return session;
  },

  /**
   * Requests a code for a registered number.
   *
   * The backend intentionally returns the same message whether or not the
   * number exists, so the response cannot be used to detect registered
   * accounts. Do not add UI that implies otherwise.
   */
  sendOtp(payload: SendOtpPayload): Promise<MessageResponse> {
    return api.post<MessageResponse>('/auth/send-otp', payload);
  },

  /** Exchanges a valid code for a session. Persists the token pair. */
  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    const session = await api.post<AuthSession>('/auth/verify-otp', payload);
    tokenStorage.set(session);
    return session;
  },

  /**
   * Manual refresh. Routine refreshing happens automatically in the Axios
   * response interceptor; this exists for explicit session bootstrapping.
   */
  async refresh(): Promise<AuthTokens> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const tokens = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
    tokenStorage.set(tokens);
    return tokens;
  },

  /**
   * Revokes the session server-side. Local tokens are cleared even if the
   * request fails, so the user is never stuck in a half-signed-in state.
   */
  async logout(): Promise<void> {
    try {
      await api.post<MessageResponse>('/auth/logout');
    } finally {
      tokenStorage.clear();
    }
  },

  hasStoredSession(): boolean {
    return tokenStorage.getAccessToken() !== null;
  },
};
