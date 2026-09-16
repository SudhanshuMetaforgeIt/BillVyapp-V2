import { appConfig } from '@/config/app.config';
import type { AuthTokens } from '@/types/user.types';

/**
 * The only module that touches token persistence.
 *
 * Deliberately separate from the auth store: the Axios client needs tokens on
 * every request, and importing the Zustand store there would create a cycle
 * (store -> service -> client -> store).
 *
 * Tokens are mirrored in memory so reads on the request path avoid hitting
 * localStorage, and so the app still works if storage is unavailable
 * (private browsing, blocked cookies).
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;

const isBrowser = (): boolean => typeof window !== 'undefined';

function readStorage(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (!isBrowser()) return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable - the in-memory copy still serves this session.
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (accessToken === null) {
      accessToken = readStorage(appConfig.auth.accessTokenKey);
    }
    return accessToken;
  },

  getRefreshToken(): string | null {
    if (refreshToken === null) {
      refreshToken = readStorage(appConfig.auth.refreshTokenKey);
    }
    return refreshToken;
  },

  set(tokens: Pick<AuthTokens, 'accessToken' | 'refreshToken'>): void {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    writeStorage(appConfig.auth.accessTokenKey, tokens.accessToken);
    writeStorage(appConfig.auth.refreshTokenKey, tokens.refreshToken);
  },

  clear(): void {
    accessToken = null;
    refreshToken = null;
    writeStorage(appConfig.auth.accessTokenKey, null);
    writeStorage(appConfig.auth.refreshTokenKey, null);
  },
};
