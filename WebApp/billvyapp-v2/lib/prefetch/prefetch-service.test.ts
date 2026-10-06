import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPrefetchCache,
  isAlreadyPrefetched,
  normalizeHref,
  prefetchRoute,
  scheduleSpeculativePrefetches,
} from './prefetch-service';

describe('prefetch-service', () => {
  beforeEach(() => {
    clearPrefetchCache();
    vi.useFakeTimers();
    // Default online
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true, connection: undefined },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('normalizeHref', () => {
    it('strips query parameters and hashes', () => {
      expect(normalizeHref('/dashboard/admin/bills?page=2#top')).toBe('/dashboard/admin/bills');
    });

    it('strips trailing slashes', () => {
      expect(normalizeHref('/dashboard/admin/bills/')).toBe('/dashboard/admin/bills');
    });

    it('keeps root path intact', () => {
      expect(normalizeHref('/')).toBe('/');
    });
  });

  describe('prefetchRoute', () => {
    it('calls router.prefetch and adds to cache', () => {
      const mockRouter = { prefetch: vi.fn() };
      const success = prefetchRoute(mockRouter, '/dashboard/admin/bills');

      expect(success).toBe(true);
      expect(mockRouter.prefetch).toHaveBeenCalledWith('/dashboard/admin/bills');
      expect(isAlreadyPrefetched('/dashboard/admin/bills')).toBe(true);
    });

    it('deduplicates: does not call router.prefetch again for already prefetched route', () => {
      const mockRouter = { prefetch: vi.fn() };
      prefetchRoute(mockRouter, '/dashboard/admin/bills');
      expect(mockRouter.prefetch).toHaveBeenCalledTimes(1);

      // Second call to same route
      const secondSuccess = prefetchRoute(mockRouter, '/dashboard/admin/bills?page=2');
      expect(secondSuccess).toBe(false);
      expect(mockRouter.prefetch).toHaveBeenCalledTimes(1);
    });

    it('ignores external or non-root URLs', () => {
      const mockRouter = { prefetch: vi.fn() };
      expect(prefetchRoute(mockRouter, 'https://external.com')).toBe(false);
      expect(prefetchRoute(mockRouter, '//external.com')).toBe(false);
      expect(mockRouter.prefetch).not.toHaveBeenCalled();
    });
  });

  describe('scheduleSpeculativePrefetches', () => {
    it('schedules and executes prefetches during idle/timer window', () => {
      const mockRouter = { prefetch: vi.fn() };
      const targets = [
        '/dashboard/admin/walk-in-billing',
        '/dashboard/admin/bills',
        '/dashboard/admin/customers',
      ];

      const cleanup = scheduleSpeculativePrefetches(mockRouter, targets);

      // Fast-forward initial idle delay + staggered delays
      vi.advanceTimersByTime(1000);

      expect(mockRouter.prefetch).toHaveBeenCalledWith('/dashboard/admin/walk-in-billing');
      expect(mockRouter.prefetch).toHaveBeenCalledWith('/dashboard/admin/bills');
      expect(mockRouter.prefetch).toHaveBeenCalledWith('/dashboard/admin/customers');

      cleanup();
    });

    it('allows cancelling pending prefetches when unmounted early', () => {
      const mockRouter = { prefetch: vi.fn() };
      const targets = [
        '/dashboard/admin/walk-in-billing',
        '/dashboard/admin/bills',
      ];

      const cleanup = scheduleSpeculativePrefetches(mockRouter, targets);
      // Cancel immediately before timer fires
      cleanup();

      vi.advanceTimersByTime(2000);
      expect(mockRouter.prefetch).not.toHaveBeenCalled();
    });

    it('caps speculative prefetches to 3 max to avoid excessive downloads', () => {
      const mockRouter = { prefetch: vi.fn() };
      const targets = [
        '/route-1',
        '/route-2',
        '/route-3',
        '/route-4',
        '/route-5',
      ];

      scheduleSpeculativePrefetches(mockRouter, targets);
      vi.advanceTimersByTime(2000);

      expect(mockRouter.prefetch).toHaveBeenCalledTimes(3);
    });
  });
});
