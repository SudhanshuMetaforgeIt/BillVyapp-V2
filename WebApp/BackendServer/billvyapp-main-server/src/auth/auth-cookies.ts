import type { CookieOptions, Response } from 'express';

/** HttpOnly refresh cookie — never readable from JavaScript. */
export const REFRESH_COOKIE_NAME = 'billvy_refresh';

/** Scoped to auth routes so the browser only attaches it to refresh/logout. */
export const REFRESH_COOKIE_PATH = '/api/auth';

export function refreshCookieOptions(
  maxAgeMs: number,
  secure: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeMs,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
  secure: boolean,
): void {
  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    refreshCookieOptions(maxAgeMs, secure),
  );
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  });
}
