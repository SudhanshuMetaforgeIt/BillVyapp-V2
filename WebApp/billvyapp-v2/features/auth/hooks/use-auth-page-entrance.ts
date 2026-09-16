'use client';

import { useRef } from 'react';

import { playAuthPageEntrance, useGSAP } from '@/lib/animations';

/**
 * Runs the shared auth-page entrance timeline once the page mounts.
 * Cleans up automatically via @gsap/react (Strict Mode safe).
 */
export function useAuthPageEntrance() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      playAuthPageEntrance({ root });
    },
    { scope: rootRef },
  );

  return rootRef;
}
