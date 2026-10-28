import { gsap } from '@/lib/animations';

/** One entrance sequence; no looping, text replacement, or DOM splitting. */
export function playAuthStoryMotion(root: HTMLElement) {
  if (!root.classList.contains('auth-story-motion')) return;
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
  timeline
    .fromTo(root.querySelector('[data-auth-story-dot]'), { scale: .4, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, clearProps: 'transform,opacity' }, .12)
    .fromTo(root.querySelector('[data-auth-story-eyebrow]'), { x: 12, opacity: 0 }, { x: 0, opacity: 1, duration: .55, clearProps: 'transform,opacity' }, .16)
    .fromTo(root.querySelectorAll('[data-auth-story-line]'), { yPercent: 110, rotation: 1.5 }, { yPercent: 0, rotation: 0, duration: .9, stagger: .14, clearProps: 'transform' }, .25)
    .fromTo(root.querySelectorAll('[data-auth-story-word]'), { y: 9, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: { amount: .4 }, clearProps: 'transform,opacity' }, .65)
    .fromTo(root.querySelector('[data-auth-story-seal]'), { scale: .8, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, clearProps: 'transform,opacity' }, 1)
    .fromTo(root.querySelector('[data-auth-story-closing]'), { x: 8, opacity: 0 }, { x: 0, opacity: 1, duration: .6, clearProps: 'transform,opacity' }, 1.08);
  return timeline;
}
