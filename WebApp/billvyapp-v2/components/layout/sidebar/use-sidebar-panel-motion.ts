'use client';

import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/animations';

export function useSidebarPanelMotion(collapsed: boolean, mobileOpen: boolean, onCloseMobile: () => void) {
  const desktopRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const previousWidth = useRef(0);
  const wasOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = desktopRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => {
      if (!gsap.isTweening(panel)) previousWidth.current = panel.getBoundingClientRect().width;
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useGSAP(() => {
    const panel = desktopRef.current;
    if (!panel) return;
    const start = gsap.isTweening(panel) ? panel.getBoundingClientRect().width : previousWidth.current;
    gsap.killTweensOf(panel);
    gsap.set(panel, { clearProps: 'width' });
    const target = panel.getBoundingClientRect().width;
    previousWidth.current = target;
    if (!start || !target || Math.abs(target - start) < 1) return;
    gsap.fromTo(panel, { width: start }, {
      width: target, duration: prefersReducedMotion() ? 0 : .48, ease: 'power3.inOut', overwrite: true,
      onComplete: () => { gsap.set(panel, { clearProps: 'width' }); previousWidth.current = panel.getBoundingClientRect().width; },
    });
  }, { scope: desktopRef, dependencies: [collapsed] });

  useGSAP(() => {
    const drawer = drawerRef.current, backdrop = backdropRef.current;
    if (!drawer || !backdrop) return;
    gsap.killTweensOf([drawer, backdrop]);
    const reduced = prefersReducedMotion();
    const links = drawer.querySelectorAll('[data-sidebar-link]');
    gsap.killTweensOf(links);
    if (mobileOpen) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Make the drawer focusable before its first animation frame.
      gsap.set(drawer, { visibility: 'visible' });
      gsap.to(backdrop, { opacity: 1, duration: reduced ? 0 : .28, ease: 'power2.out', overwrite: true });
      gsap.to(drawer, { xPercent: 0, x: 0, autoAlpha: 1, duration: reduced ? 0 : .46, ease: 'power3.out', overwrite: true });
      if (!reduced) gsap.fromTo(links, { opacity: 0, x: -10 }, { opacity: 1, x: 0, delay: .08, duration: .32, stagger: { amount: .18 }, ease: 'power3.out', clearProps: 'opacity,transform' });
      else gsap.set(links, { clearProps: 'opacity,transform' });
      if (window.matchMedia('(max-width: 1023px)').matches) {
        (drawer.querySelector<HTMLElement>('[aria-current="page"]') ?? drawer.querySelector<HTMLElement>('a, button'))?.focus({ preventScroll: true });
      }
    } else {
      gsap.to(backdrop, { opacity: 0, duration: reduced ? 0 : .2, ease: 'power2.in', overwrite: true });
      gsap.to(drawer, { xPercent: -105, x: 0, autoAlpha: 0, duration: reduced ? 0 : .3, ease: 'power3.inOut', overwrite: true });
      if (wasOpen.current && window.matchMedia('(max-width: 1023px)').matches) returnFocus.current?.focus({ preventScroll: true });
    }
    wasOpen.current = mobileOpen;
  }, { scope: drawerRef, dependencies: [mobileOpen] });

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      const drawer = drawerRef.current;
      if (!drawer || !window.matchMedia('(max-width: 1023px)').matches) return;
      if (event.key === 'Escape') { event.preventDefault(); onCloseMobile(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].filter(e => e.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1);
      if (!first || !last) return;
      if (!drawer.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  return { desktopRef, drawerRef, backdropRef };
}
