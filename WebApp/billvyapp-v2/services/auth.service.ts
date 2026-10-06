import type { MessageResponse } from '@/types/api.types';
import type { AuthSession, AuthTokens, AuthUser } from '@/types/user.types';
import { useAuthStore } from '@/stores/auth.store';
import { api, refreshSession } from './api-client';

/**
 * Auth API surface. One function per backend endpoint, no UI concerns.
 *
 * Access tokens are stored in the Zustand auth store (memory only).
 * Refresh tokens are HttpOnly cookies set by the API — never read in JS.
 */

/** Full identity payload from GET /auth/me (broader than the session AuthUser). */
export type AuthMeUser = AuthUser & {
  phone: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  subscriptionActive?: boolean;
  subscriptionPlanName?: string | null;
  subscriptionEndsAt?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
  salonName?: string | null;
  timezone?: string | null;
  language?: string | null;
};

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  /** Exactly 10 digits, no +91 - matches the backend DTO and users.phone. */
  phone: string;
  password: string;
}

export interface SendOtpPayload {
  /** Exactly 10 digits, no +91 - matches the backend DTO and users.phone. */
  phone: string;
}

/** Field names mirror the backend VerifyOtpDto exactly. */
export interface VerifyOtpPayload {
  phone: string;
  otp: string;
}

/** POST /auth/send-otp. `devOtp` is only present when the backend exposes it outside production. */
export interface SendOtpResponse extends MessageResponse {
  devOtp?: string;
}

function persistAccessToken(session: AuthSession | AuthTokens): void {
  useAuthStore.getState().setAccessToken(session.accessToken);
}

/** Clear legacy localStorage token keys from earlier builds. */
function clearLegacyTokenStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('billvy.access-token');
    window.localStorage.removeItem('billvy.refresh-token');
  } catch {
    // ignore
  }
}

export const authService = {
  /** Staff, admin, and customer sign-in. Stores access token in Zustand. */
  async login(payload: LoginPayload): Promise<AuthSession> {
    clearLegacyTokenStorage();
    const session = await api.post<AuthSession>('/auth/login', payload);
    persistAccessToken(session);
    return session;
  },

  /**
   * Public customer self-registration.
   *
   * Never send role / roleId / franchiseId / salonId — the backend rejects
   * unknown fields and always assigns CUSTOMER server-side.
   */
  async register(payload: RegisterPayload): Promise<AuthSession> {
    clearLegacyTokenStorage();
    const session = await api.post<AuthSession>('/auth/register', payload);
    persistAccessToken(session);
    return session;
  },

  /**
   * Requests a code for a registered number.
   *
   * The backend intentionally returns the same message whether or not the
   * number exists, so the response cannot be used to detect registered
   * accounts. Do not add UI that implies otherwise.
   */
  sendOtp(payload: SendOtpPayload): Promise<SendOtpResponse> {
    return api.post<SendOtpResponse>('/auth/send-otp', payload);
  },

  /** Exchanges a valid code for a session. Stores access token in Zustand. */
  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
    clearLegacyTokenStorage();
    const session = await api.post<AuthSession>('/auth/verify-otp', payload);
    persistAccessToken(session);
    return session;
  },

  /**
   * Cookie-based refresh returns the verified user. It shares an in-flight
   * request with the Axios interceptor so the rotating cookie is used once.
   */
  refresh(): Promise<AuthSession> {
    return refreshSession();
  },

  /**
   * Revokes the session server-side and clears the HttpOnly refresh cookie.
   * Local access token is cleared even if the request fails.
   */
  async logout(): Promise<void> {
    try {
      await api.post<MessageResponse>('/auth/logout', {});
    } finally {
      useAuthStore.getState().clearSession();
      clearLegacyTokenStorage();
    }
  },

  hasStoredSession(): boolean {
    return useAuthStore.getState().accessToken !== null;
  },

  /** Authoritative identity for the signed-in user. */
  me(): Promise<AuthMeUser> {
    return api.get<AuthMeUser>('/auth/me');
  },
};
