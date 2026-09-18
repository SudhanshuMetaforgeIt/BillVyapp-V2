'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP, playUniversalPageEntrance } from '@/lib/animations';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;
      playUniversalPageEntrance(containerRef.current);
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className={className ?? 'w-full'}>
      {children}
    </div>
  );
}
