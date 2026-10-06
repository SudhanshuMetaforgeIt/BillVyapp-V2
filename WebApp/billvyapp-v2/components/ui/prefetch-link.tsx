'use client';

import {
  forwardRef,
  useCallback,
  useRef,
  useEffect,
  type ComponentPropsWithoutRef,
  type PointerEvent,
  type FocusEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { prefetchRoute, scheduleSpeculativePrefetches } from '@/lib/prefetch/prefetch-service';

export type PrefetchStrategy = 'intent' | 'idle' | 'eager' | 'none';

export type PrefetchLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  /**
   * Strategy for prefetching:
   * - 'intent' (default): Prefetches on sustained hover (65ms debounce) or focus. Prevents downloading when cursor quickly sweeps across.
   * - 'idle': Prefetches during browser idle time via requestIdleCallback. Ideal for primary action CTAs.
   * - 'eager': Standard Next.js viewport prefetching.
   * - 'none': Disables prefetching entirely.
   */
  prefetchStrategy?: PrefetchStrategy;
  /** Hover intent debounce in milliseconds (default: 65ms). */
  intentDelayMs?: number;
};

function getHrefString(href: unknown): string {
  if (typeof href === 'string') return href;
  if (href && typeof href === 'object' && 'pathname' in href) {
    const obj = href as { pathname?: string | null };
    return obj.pathname || '';
  }
  return '';
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink(
    {
      href,
      prefetchStrategy = 'intent',
      intentDelayMs = 65,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      prefetch: explicitPrefetch,
      ...rest
    },
    ref,
  ) {
    const router = useRouter();
    const timeoutRef = useRef<number | null>(null);
    const hrefStr = getHrefString(href);

    const triggerPrefetch = useCallback(() => {
      if (!hrefStr || prefetchStrategy === 'none' || prefetchStrategy === 'eager') return;
      prefetchRoute(router, hrefStr);
    }, [hrefStr, prefetchStrategy, router]);

    // Handle 'idle' prefetch strategy
    useEffect(() => {
      if (prefetchStrategy === 'idle' && hrefStr) {
        const cleanup = scheduleSpeculativePrefetches(router, [hrefStr]);
        return cleanup;
      }
    }, [prefetchStrategy, hrefStr, router]);

    // Cleanup any pending pointer hover timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const handlePointerEnter = (e: PointerEvent<HTMLAnchorElement>) => {
      onPointerEnter?.(e);
      if (prefetchStrategy !== 'intent' && prefetchStrategy !== 'idle') return;

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        triggerPrefetch();
      }, intentDelayMs);
    };

    const handlePointerLeave = (e: PointerEvent<HTMLAnchorElement>) => {
      onPointerLeave?.(e);
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleFocus = (e: FocusEvent<HTMLAnchorElement>) => {
      onFocus?.(e);
      if (prefetchStrategy === 'intent' || prefetchStrategy === 'idle') {
        triggerPrefetch();
      }
    };

    // When prefetchStrategy is 'intent', 'idle', or 'none', we pass prefetch={false}
    // to Next.js Link so Next.js does NOT automatically download all routes in the viewport.
    const resolvedNextPrefetch =
      explicitPrefetch !== undefined
        ? explicitPrefetch
        : prefetchStrategy === 'eager'
          ? undefined
          : false;

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={resolvedNextPrefetch}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        {...rest}
      />
    );
  },
);

PrefetchLink.displayName = 'PrefetchLink';
