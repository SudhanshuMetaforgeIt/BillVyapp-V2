import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * Client-only GSAP bootstrap for BillVyApp.
 *
 * Register the React plugin once. Import this module (or presets that
 * re-export from it) only from Client Components.
 */

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/** True when the user prefers reduced motion. SSR-safe (false on server). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Mobile-ish viewport — used to shorten travel distances. */
export function isCompactViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 1023px)').matches;
}
