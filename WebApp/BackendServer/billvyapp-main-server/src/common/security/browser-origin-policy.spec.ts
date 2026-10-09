import {
  allowedBrowserOrigins,
  browserOriginMiddleware,
  isBrowserOriginAllowed,
} from './browser-origin-policy';
import { refreshCookieOptions } from '../../auth/auth-cookies';

describe('Browser cookie trust boundary', () => {
  it.each([
    'http://192.168.1.50:3001',
    'http://10.0.0.5:3001',
    'http://172.16.2.5:4000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://[::1]:4000',
  ])('permits local network origin %s only outside production', (origin) => {
    const origins = ['http://localhost:3001'];
    expect(isBrowserOriginAllowed(origin, origins, false)).toBe(true);
    expect(isBrowserOriginAllowed(origin, origins, true)).toBe(false);
    const next = jest.fn();
    browserOriginMiddleware(origins, false)(
      {
        method: 'POST',
        cookies: { billvy_refresh: 'token' },
        get: (name: string) => (name === 'origin' ? origin : undefined),
      } as never,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
  it.each([
    'http://192.168.1.50.evil.example:3001',
    'https://evil.example',
    'http://172.32.0.1:3001',
    'http://8.8.8.8:3001',
    'null',
    'http://192.168.1.50:3001/path',
  ])('rejects nonlocal or malformed development origin %s', (origin) => {
    expect(isBrowserOriginAllowed(origin, [], false)).toBe(false);
  });
  it('refuses wildcard and non-HTTPS production origins', () => {
    expect(() => allowedBrowserOrigins('*', true)).toThrow();
    expect(() => allowedBrowserOrigins('http://example.com', true)).toThrow();
    expect(allowedBrowserOrigins('https://app.example.com', true)).toEqual([
      'https://app.example.com',
    ]);
  });
  it.each(['https://evil.example.com', undefined])(
    'rejects refresh cookies from untrusted or absent origin %s',
    (origin) => {
      const next = jest.fn();
      browserOriginMiddleware(['https://app.example.com'])(
        {
          method: 'POST',
          cookies: { billvy_refresh: 'token' },
          get: (name: string) => (name === 'origin' ? origin : undefined),
        } as never,
        {} as never,
        next,
      );
      const calls = next.mock.calls as [{ getStatus(): number }][];
      expect(calls[0][0].getStatus()).toBe(403);
    },
  );
  it('allows exact origins and explicit non-browser token requests', () => {
    const next = jest.fn();
    const middleware = browserOriginMiddleware(['https://app.example.com']);
    middleware(
      {
        method: 'POST',
        cookies: { billvy_refresh: 'token' },
        get: () => 'https://app.example.com',
      } as never,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledWith();
    next.mockClear();
    middleware(
      { method: 'POST', cookies: {}, get: () => undefined } as never,
      {} as never,
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
  it('sets production refresh cookies HttpOnly, Secure and SameSite lax', () => {
    expect(refreshCookieOptions(1000, true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth',
    });
  });
});
