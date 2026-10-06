import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as prefetchService from '@/lib/prefetch/prefetch-service';
import * as predictions from '@/lib/prefetch/prefetch-predictions';

// Mock dependencies
const mockRouter = { prefetch: vi.fn() };
const currentPathname = '/dashboard/admin';
const currentUser: { role: string } | null = { role: 'ADMIN' };

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => mockRouter,
}));

vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUser,
}));

describe('useLikelyNextPagesPrefetch logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefetchService.clearPrefetchCache();
  });

  it('predicts correct routes for admin and calls scheduleSpeculativePrefetches', () => {
    const spy = vi.spyOn(prefetchService, 'scheduleSpeculativePrefetches');
    const routes = predictions.getLikelyNextRoutes('/dashboard/admin', 'ADMIN');

    expect(routes).toContain('/dashboard/admin/walk-in-billing');
    expect(routes).toContain('/dashboard/admin/bills');

    const cleanup = prefetchService.scheduleSpeculativePrefetches(mockRouter, routes);
    expect(spy).toHaveBeenCalledWith(mockRouter, routes);
    cleanup();
  });

  it('respects custom override routes when passed', () => {
    const spy = vi.spyOn(prefetchService, 'scheduleSpeculativePrefetches');
    const custom = ['/custom-1', '/custom-2'];

    const cleanup = prefetchService.scheduleSpeculativePrefetches(mockRouter, custom);
    expect(spy).toHaveBeenCalledWith(mockRouter, custom);
    cleanup();
  });
});
