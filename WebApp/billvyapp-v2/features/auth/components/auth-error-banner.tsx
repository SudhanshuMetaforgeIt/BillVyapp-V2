'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { playErrorReveal } from '@/lib/animations';

/** Subtle GSAP reveal when an auth error banner mounts. */
export function AuthErrorBanner({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    playErrorReveal(ref.current);
  }, []);

  return (
    <p ref={ref} role="alert" className={className}>
      {children}
    </p>
  );
}
