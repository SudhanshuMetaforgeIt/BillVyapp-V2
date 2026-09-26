import { describe, expect, it } from 'vitest';

import { isApiError } from './api-client';
import type { ApiError } from '@/types/api.types';

describe('api error mapping', () => {
  it('recognises normalised API errors used by query retry and UI', () => {
    const forbidden: ApiError = { status: 403, message: 'Insufficient role' };
    const missing: ApiError = { status: 404, message: 'Not found' };
    const server: ApiError = { status: 500, message: 'Something went wrong. Please try again.' };
    const network: ApiError = { status: 0, message: 'Cannot reach the server. Check your connection.' };

    expect(isApiError(forbidden)).toBe(true);
    expect(isApiError(missing)).toBe(true);
    expect(isApiError(server)).toBe(true);
    expect(isApiError(network)).toBe(true);
    expect(isApiError(new Error('raw'))).toBe(false);
  });

  it('treats 4xx as non-retryable and 5xx/network as retryable', () => {
    const retry = (failureCount: number, error: unknown) => {
      if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
      return failureCount < 2;
    };

    expect(retry(0, { status: 401, message: 'expired' })).toBe(false);
    expect(retry(0, { status: 403, message: 'no' })).toBe(false);
    expect(retry(0, { status: 404, message: 'gone' })).toBe(false);
    expect(retry(0, { status: 500, message: 'boom' })).toBe(true);
    expect(retry(0, { status: 0, message: 'offline' })).toBe(true);
    expect(retry(2, { status: 500, message: 'boom' })).toBe(false);
  });
});
