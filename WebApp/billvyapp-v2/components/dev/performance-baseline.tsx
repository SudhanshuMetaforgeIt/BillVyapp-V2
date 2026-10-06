'use client';

import { useEffect, Profiler, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { useQueryClient } from '@tanstack/react-query';

const enabled = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PERFORMANCE_BASELINE === 'true';
type Sample = { kind: string; page: string; atMs: number; values: Record<string, string | number | boolean | null> };
const samples: Sample[] = [];
let page = '';
function record(kind: string, values: Sample['values']) {
  if (!enabled) return;
  if (samples.length === 10000) samples.shift();
  samples.push({ kind, page, atMs: performance.now(), values });
}
function vitals(metric: { name: string; value: number; id: string }) {
  record('web-vital', { name: metric.name, value: metric.value, id: metric.id });
}
function download() {
  const blob = new Blob([JSON.stringify({ capturedAt: new Date().toISOString(), sampleLimit: 10000, samples }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'frontend-baseline.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
declare global {
  interface Window { billvyBaseline?: { download: () => void; reset: () => void; snapshot: () => Sample[] } }
}

export function PerformanceBaseline({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const client = useQueryClient();
  useReportWebVitals(vitals);
  useEffect(() => {
    page = pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
    record('navigation', { path: page });
  }, [pathname]);
  useEffect(() => {
    if (!enabled) return;
    window.billvyBaseline = { download, reset: () => { samples.length = 0; }, snapshot: () => [...samples] };
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          record('document', { ttfbMs: nav.responseStart - nav.startTime, durationMs: nav.duration });
        } else {
          const resource = entry as PerformanceResourceTiming;
          const url = new URL(resource.name);
          // No query strings, tokens, or user-entered searches in the exported data.
          const path = url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
          record(path.includes('/api/') ? 'api-resource' : 'resource', {
            path, initiator: resource.initiatorType, durationMs: resource.duration,
            ttfbMs: resource.responseStart > 0 ? resource.responseStart - resource.startTime : null,
            transferBytes: resource.transferSize, encodedBytes: resource.encodedBodySize,
            decodedBytes: resource.decodedBodySize,
            sizesAvailable: url.origin === location.origin || resource.transferSize > 0,
          });
        }
      }
    });
    observer.observe({ type: 'resource', buffered: true });
    const navigation = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming;
        record('document', { ttfbMs: nav.responseStart - nav.startTime, durationMs: nav.duration });
      }
    });
    navigation.observe({ type: 'navigation', buffered: true });
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type === 'observerAdded') record('query-cache-observed', {
        hasData: event.query.state.data !== undefined,
        stale: event.query.isStale(),
      });
      if (event.type === 'updated' && event.action.type === 'fetch') record('query-fetch-start', {});
    });
    return () => { observer.disconnect(); navigation.disconnect(); unsubscribe(); delete window.billvyBaseline; };
  }, [client]);
  return enabled ? <Profiler id="application" onRender={(_id, phase, actualDuration, baseDuration) => record('react-render', { phase, actualDurationMs: actualDuration, baseDurationMs: baseDuration })}>{children}</Profiler> : children;
}
