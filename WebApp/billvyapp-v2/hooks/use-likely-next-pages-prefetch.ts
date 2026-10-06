'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useCurrentUser } from '@/hooks/use-current-user';
import { getLikelyNextRoutes } from '@/lib/prefetch/prefetch-predictions';
import { scheduleSpeculativePrefetches } from '@/lib/prefetch/prefetch-service';

/**
 * Automatically prefetches high-probability next pages during idle browser time.
 *
 * Guarantees:
 * - Only 2-3 prioritized routes per view.
 * - Suppressed on slow connections and Data Saver mode.
 * - Deduplicated across the entire user session.
 * - Scheduled via `requestIdleCallback` to avoid competing with page rendering.
 */
export function useLikelyNextPagesPrefetch(customRoutes?: string[]): void {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();

  useEffect(() => {
    if (!pathname) return;

    const routes = customRoutes && customRoutes.length > 0
      ? customRoutes
      : getLikelyNextRoutes(pathname, user?.role);

    if (!routes || routes.length === 0) return;

    const cleanup = scheduleSpeculativePrefetches(router, routes);
    return cleanup;
  }, [pathname, router, user?.role, customRoutes]);
}
