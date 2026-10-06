import { canPrefetchOnIntent, shouldSpeculativelyPrefetch } from './prefetch-budget';

export type PrefetchableRouter = {
  prefetch: (href: string) => void;
};

// Global session registry to guarantee no route is ever prefetched twice
const prefetchedRoutes = new Set<string>();

/**
 * Normalizes an href for cache tracking (strips hash and query for deduplication).
 */
export function normalizeHref(href: string): string {
  if (!href) return '';
  const clean = href.split('?')[0].split('#')[0].trim();
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean;
}

export function isAlreadyPrefetched(href: string): boolean {
  return prefetchedRoutes.has(normalizeHref(href));
}

export function clearPrefetchCache(): void {
  prefetchedRoutes.clear();
}

/**
 * Prefetches a route on demand (e.g. from user hover or focus intent).
 * Respects connection constraints and deduplication.
 */
export function prefetchRoute(
  router: PrefetchableRouter,
  href: string,
  options?: { force?: boolean; ignoreBudget?: boolean },
): boolean {
  if (!href || !router?.prefetch) {
    return false;
  }

  // Only internal routes starting with '/'
  if (!href.startsWith('/') || href.startsWith('//')) {
    return false;
  }

  const key = normalizeHref(href);
  if (!options?.force && prefetchedRoutes.has(key)) {
    return false;
  }

  if (!options?.ignoreBudget && !canPrefetchOnIntent()) {
    return false;
  }

  try {
    prefetchedRoutes.add(key);
    router.prefetch(href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedules speculative prefetching for a list of likely next routes during browser idle time.
 * Staggers execution to prevent burst network spikes.
 * Returns a cleanup/cancellation function.
 */
export function scheduleSpeculativePrefetches(
  router: PrefetchableRouter,
  hrefs: string[],
): () => void {
  if (!router?.prefetch || !hrefs.length) {
    return () => {};
  }

  if (!shouldSpeculativelyPrefetch()) {
    return () => {};
  }

  const validHrefs = hrefs
    .map(normalizeHref)
    .filter((href) => href && href.startsWith('/') && !prefetchedRoutes.has(href))
    // Hard limit to max 3 next pages per schedule to keep downloads minimal
    .slice(0, 3);

  if (!validHrefs.length) {
    return () => {};
  }

  let cancelled = false;
  const timeoutIds: Array<ReturnType<typeof setTimeout>> = [];
  let idleId: number | null = null;

  const executePrefetches = () => {
    if (cancelled) return;

    validHrefs.forEach((href, index) => {
      // Stagger prefetches by 200ms
      const tid = setTimeout(() => {
        if (cancelled) return;
        if (!shouldSpeculativelyPrefetch()) return;

        if (!prefetchedRoutes.has(href)) {
          prefetchedRoutes.add(href);
          try {
            router.prefetch(href);
          } catch {
            // Silently absorb router errors
          }
        }
      }, index * 200);

      timeoutIds.push(tid);
    });
  };

  // Schedule during browser idle time if supported, otherwise fallback to modest delay
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    idleId = window.requestIdleCallback(executePrefetches, { timeout: 2000 });
  } else {
    const tid = setTimeout(executePrefetches, 600);
    timeoutIds.push(tid);
  }

  return () => {
    cancelled = true;
    if (
      idleId !== null &&
      typeof window !== 'undefined' &&
      typeof window.cancelIdleCallback === 'function'
    ) {
      window.cancelIdleCallback(idleId);
    }
    timeoutIds.forEach((id) => clearTimeout(id));
  };
}
