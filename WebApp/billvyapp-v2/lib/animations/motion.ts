import type { Transition, Variants } from 'motion/react';

/**
 * Shared Motion variants (non-GSAP).
 *
 * Kept for future UI that prefers Motion. Auth pages use the GSAP presets.
 */

export const EASE_OUT: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: EASE_OUT },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: EASE_OUT },
  exit: { opacity: 0, y: 4, transition: { duration: 0.15 } },
};

/** Parent wrapper that reveals children one after another. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: EASE_OUT },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
};

/** Off-canvas panel, e.g. the mobile sidebar. */
export const slideInFromLeft: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: EASE_OUT },
  exit: { x: '-100%', transition: { duration: 0.18 } },
};
