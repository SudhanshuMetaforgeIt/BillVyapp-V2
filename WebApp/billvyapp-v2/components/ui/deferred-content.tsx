'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function DeferredContent({ children, height = 400 }: { children: ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="min-w-0" style={{ minHeight: visible ? undefined : height }}>
    {visible ? children : <div role="status" aria-label="Loading chart" className="animate-pulse rounded-2xl border border-border bg-surface" style={{ height }} />}
  </div>;
}
