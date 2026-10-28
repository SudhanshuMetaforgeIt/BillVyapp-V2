'use client';

import { useRef } from 'react';

import { gsap, playAuthPageEntrance, useGSAP } from '@/lib/animations';
import { playAuthStoryMotion } from './auth-story-motion';

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
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        playAuthPageEntrance({ root });
        const background = root.querySelector('[data-auth-scene]');
        if (background) gsap.fromTo(background, { scale: 1.035, opacity: .6 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity' });
      }, root);
      media.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', () => {
        playAuthStoryMotion(root);
      }, root);
      return () => media.revert();
    },
    { scope: rootRef },
  );

  return rootRef;
}
