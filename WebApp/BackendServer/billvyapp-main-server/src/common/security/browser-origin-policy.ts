import { ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { REFRESH_COOKIE_NAME } from '../../auth/auth-cookies';

export function allowedBrowserOrigins(
  raw: string,
  production: boolean,
): string[] {
  if (raw === '*' && production)
    throw new Error('Production requires explicit CORS_ORIGIN values');
  const values =
    raw === '*'
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
        ]
      : raw.split(',').map((value) => value.trim());
  if (
    !values.length ||
    values.some((value) => {
      try {
        const url = new URL(value);
        return (
          url.origin !== value ||
          (production && url.protocol !== 'https:') ||
          !['http:', 'https:'].includes(url.protocol)
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error(
      'CORS_ORIGIN must contain exact browser origins (HTTPS in production)',
    );
  return values;
}

/** Local development accepts LAN IPs without widening the production allowlist. */
export function isBrowserOriginAllowed(
  origin: string,
  origins: readonly string[],
  production = true,
): boolean {
  if (origins.includes(origin)) return true;
  if (production) return false;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
      return false;
    const host = url.hostname;
    if (['localhost', '[::1]'].includes(host)) return true;
    const parts = host.split('.');
    if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part)))
      return false;
    const [first, second] = parts.map(Number);
    return (
      first === 127 ||
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  } catch {
    return false;
  }
}

/** Browser cookies are credentials: reject unsafe cross-origin requests, including refresh. */
export function browserOriginMiddleware(
  origins: readonly string[],
  production = true,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (
      (origin && !isBrowserOriginAllowed(origin, origins, production)) ||
      (req.cookies?.[REFRESH_COOKIE_NAME] && !origin) ||
      (!origin && req.get('sec-fetch-site') === 'cross-site')
    ) {
      return next(new ForbiddenException('Request origin is not permitted'));
    }
    next();
  };
}
