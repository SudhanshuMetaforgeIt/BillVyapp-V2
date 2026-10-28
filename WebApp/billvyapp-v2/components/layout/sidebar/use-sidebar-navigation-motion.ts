'use client';

import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/animations';

export function useSidebarNavigationMotion(pathname: string, collapsed: boolean, mobile: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const positioned = useRef(false);
  const wasCollapsed = useRef(collapsed);
  const { contextSafe } = useGSAP({ scope: rootRef });

  useGSAP(() => {
    const root = rootRef.current;
    if (!root || mobile || prefersReducedMotion()) return;
    gsap.fromTo(root.querySelectorAll('[data-sidebar-enter]'), { opacity: 0, y: 6 }, {
      opacity: 1, y: 0, duration: .45, stagger: .06, ease: 'power3.out', clearProps: 'opacity,transform',
    });
    gsap.fromTo(root.querySelectorAll('[data-sidebar-link]'), { opacity: 0, x: -8 }, {
      opacity: 1, x: 0, duration: .42, delay: .06, stagger: { amount: .22 }, ease: 'power3.out', clearProps: 'opacity,transform',
    });
  }, { scope: rootRef });

  useGSAP(() => {
    const root = rootRef.current;
    const active = root?.querySelector<HTMLElement>('[data-sidebar-link][aria-current="page"]');
    const indicator = root?.querySelector<HTMLElement>('[data-sidebar-indicator]');
    if (!indicator) return;
    if (!active) {
      gsap.set(indicator, { autoAlpha: 0 });
    } else {
      gsap.to(indicator, {
        x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight,
        autoAlpha: 1, duration: positioned.current && !prefersReducedMotion() ? .4 : 0,
        ease: 'power3.out', overwrite: true,
      });
      positioned.current = true;
    }
    if (wasCollapsed.current && !collapsed && !prefersReducedMotion()) {
      gsap.fromTo(root!.querySelectorAll('[data-sidebar-label]'), { opacity: 0, x: -5 }, {
        opacity: 1, x: 0, duration: .25, delay: .1, stagger: { amount: .12 }, ease: 'power2.out', clearProps: 'opacity,transform',
      });
    }
    wasCollapsed.current = collapsed;
  }, { scope: rootRef, dependencies: [pathname, collapsed] });

  useEffect(() => {
    const root = rootRef.current;
    const list = root?.querySelector<HTMLElement>('[data-sidebar-list]');
    if (!root || !list) return;
    const observer = new ResizeObserver(() => {
      const active = root.querySelector<HTMLElement>('[data-sidebar-link][aria-current="page"]');
      const indicator = root.querySelector<HTMLElement>('[data-sidebar-indicator]');
      if (active && indicator) gsap.set(indicator, {
        x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, autoAlpha: 1,
      });
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  const animateLink = contextSafe((link: HTMLElement, entering: boolean) => {
    if (prefersReducedMotion()) return;
    const icon = link.querySelector('[data-sidebar-icon]');
    const label = link.querySelector('[data-sidebar-label]');
    if (icon) gsap.to(icon, { scale: entering ? 1.1 : 1, y: entering ? -1 : 0, duration: .2, ease: 'power2.out', overwrite: 'auto' });
    if (label) gsap.to(label, { x: entering ? 2 : 0, duration: .2, ease: 'power2.out', overwrite: 'auto' });
  });
  return { rootRef, animateLink };
}
