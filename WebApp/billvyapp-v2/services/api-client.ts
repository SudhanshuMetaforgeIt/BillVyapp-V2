import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { appConfig } from '@/config/app.config';
import type { ApiError, ApiErrorBody } from '@/types/api.types';
import type { AuthTokens } from '@/types/user.types';
import { tokenStorage } from './token-storage';

/**
 * The single Axios instance for the whole application.
 *
 * Feature services MUST import this rather than creating their own instance,
 * otherwise auth headers, error normalisation and refresh handling are lost.
 *
 * Responsibilities:
 *   1. Attach the bearer token to every request.
 *   2. Normalise every failure into ApiError, so the UI never handles
 *      AxiosError shapes or leaks raw backend errors.
 *   3. Refresh the token pair once on a 401 and replay the original request.
 */

/** Marks a request that has already been retried, preventing infinite loops. */
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: appConfig.api.baseUrl,
  timeout: appConfig.api.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------- session end

type SessionExpiredHandler = () => void;

let onSessionExpired: SessionExpiredHandler | null = null;

/**
 * Registered once at app startup so the client can announce a dead session
 * without importing the auth store (which would be a circular dependency).
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

function endSession(): void {
  tokenStorage.clear();
  onSessionExpired?.();
}

// ------------------------------------------------------------ error normalise

function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { status: 0, message: 'Something went wrong. Please try again.' };
  }

  const axiosError = error as AxiosError<ApiErrorBody>;

  if (axiosError.code === 'ECONNABORTED') {
    return { status: 0, message: 'The request timed out. Please try again.' };
  }

  if (!axiosError.response) {
    return {
      status: 0,
      message: 'Cannot reach the server. Check your connection.',
    };
  }

  const { status, data } = axiosError.response;

  // DTO validation failures arrive as an array of field messages.
  if (Array.isArray(data?.message)) {
    return {
      status,
      message: data.message[0] ?? 'Please check the submitted values.',
      details: data.message,
    };
  }

  return {
    status,
    message:
      typeof data?.message === 'string'
        ? data.message
        : 'Something went wrong. Please try again.',
  };
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value
  );
}

// ------------------------------------------------------------------- refresh

/**
 * Shared across concurrent 401s so a burst of failed requests triggers exactly
 * one refresh call rather than one per request.
 */
let refreshInFlight: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  // A bare axios call on purpose: going through apiClient would re-enter this
  // interceptor and recurse if the refresh itself returns 401.
  const { data } = await axios.post<AuthTokens>(
    `${appConfig.api.baseUrl}/auth/refresh`,
    { refreshToken },
    { timeout: appConfig.api.timeoutMs },
  );

  tokenStorage.set(data);
  return data;
}

// -------------------------------------------------------------- interceptors

/**
 * Credential endpoints where a 401 means bad input, not an expired session.
 * Protected auth routes like GET /auth/me must still refresh + retry.
 */
function isCredentialAuthRequest(url?: string): boolean {
  if (!url) return false;
  return [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/send-otp',
    '/auth/verify-otp',
  ].some((path) => url.includes(path));
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;
    const status = error.response?.status;

    const skipRefresh = isCredentialAuthRequest(request?.url);
    const shouldAttemptRefresh =
      status === 401 && request && !request._retried && !skipRefresh;

    if (shouldAttemptRefresh) {
      request._retried = true;

      try {
        refreshInFlight ??= refreshTokens();
        const tokens = await refreshInFlight;

        request.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(request);
      } catch {
        endSession();
        return Promise.reject(toApiError(error));
      } finally {
        refreshInFlight = null;
      }
    }

    // A 401 after a failed retry (or with no refresh token) means the session is gone.
    // Credential auth failures (wrong password, etc.) must not clear a live session.
    if (status === 401 && !skipRefresh) {
      endSession();
    }

    return Promise.reject(toApiError(error));
  },
);

// -------------------------------------------------------------------- helpers

/**
 * Thin typed wrappers. They unwrap `response.data` so feature services read as
 * `return api.get<Customer[]>('/customers')`.
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, body, config).then((r) => r.data),

  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, body, config).then((r) => r.data),

  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, body, config).then((r) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((r) => r.data),
};
