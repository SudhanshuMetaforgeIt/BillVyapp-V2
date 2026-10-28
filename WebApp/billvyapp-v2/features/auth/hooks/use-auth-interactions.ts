'use client';

import type { RefObject } from 'react';
import { gsap, useGSAP } from '@/lib/animations';

/** Delegated motion also covers controls mounted by the OTP and recovery steps. */
export function useAuthInteractions(rootRef: RefObject<HTMLDivElement | null>) {
  useGSAP(() => {
    const root = rootRef.current;
    if (!root?.classList.contains('login-page-shell')) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', context => {
      const hover = new WeakSet<HTMLElement>();
      const focus = new WeakSet<HTMLElement>();
      let pressed: HTMLElement | null = null;
      const animate = context.add('animate', (target: gsap.TweenTarget, vars: gsap.TweenVars) => gsap.to(target, vars)) as (target: gsap.TweenTarget, vars: gsap.TweenVars) => gsap.core.Tween;
      const controlFor = (target: EventTarget | null) => {
        const element = target instanceof Element ? target.closest<HTMLElement>('button, a') : null;
        return element && root.contains(element) ? element : null;
      };
      const enabled = (element: HTMLElement) => !element.matches(':disabled, [aria-disabled="true"]');
      const refresh = (element: HTMLElement) => {
        const primary = element.classList.contains('auth-cta');
        const highlighted = hover.has(element) || focus.has(element);
        const down = pressed === element && enabled(element);
        animate(element, {
          scale: down ? .975 : 1,
          ...(primary ? { y: down ? 0 : highlighted ? -2 : 0, boxShadow: highlighted ? '0 10px 28px -8px rgba(255,145,25,.5)' : '0 6px 16px -6px rgba(248,121,0,.3)' } : {}),
          duration: down ? .12 : .24, ease: 'power3.out', overwrite: 'auto',
        });
        const arrow = element.querySelector('.lucide-arrow-right, .lucide-arrow-left');
        if (arrow) animate(arrow, { x: highlighted && !down ? (arrow.classList.contains('lucide-arrow-left') ? -3 : 3) : 0, duration: .24, ease: 'power3.out', overwrite: 'auto' });
      };
      const shine = (element: HTMLElement) => {
        if (!element.classList.contains('auth-cta')) return;
        animate(element, { '--auth-shine': '140%', duration: .7, startAt: { '--auth-shine': '-140%' }, ease: 'power2.out', overwrite: 'auto' });
      };
      const onOver = (event: PointerEvent) => {
        const element = controlFor(event.target);
        if (event.pointerType !== 'mouse' || !element || !enabled(element) || controlFor(event.relatedTarget) === element) return;
        hover.add(element); refresh(element); shine(element);
      };
      const onOut = (event: PointerEvent) => {
        const element = controlFor(event.target);
        if (!element || controlFor(event.relatedTarget) === element) return;
        hover.delete(element); refresh(element);
      };
      const onFocus = (event: FocusEvent) => {
        const element = controlFor(event.target);
        if (element && enabled(element) && element.matches(':focus-visible')) { focus.add(element); refresh(element); shine(element); }
      };
      const onBlur = (event: FocusEvent) => {
        const element = controlFor(event.target);
        if (element) { focus.delete(element); refresh(element); }
      };
      const press = (target: EventTarget | null) => {
        const element = controlFor(target);
        if (!element || !enabled(element)) return;
        if (pressed && pressed !== element) { const previous = pressed; pressed = null; refresh(previous); }
        pressed = element; refresh(element);
      };
      const release = () => { if (pressed) { const element = pressed; pressed = null; refresh(element); } };
      const onDown = (event: PointerEvent) => { if (event.button === 0) press(event.target); };
      const onKeyDown = (event: KeyboardEvent) => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) press(event.target); };
      const onKeyUp = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') release(); };
      const revealStep = context.add('revealStep', (card: HTMLElement) => {
        const parts = card.querySelectorAll('.login-form-heading, .recovery-progress, form, .auth-step-secondary');
        gsap.fromTo(parts, { opacity: .45, y: 9 }, { opacity: 1, y: 0, duration: .38, stagger: .035, ease: 'power3.out', overwrite: 'auto', clearProps: 'opacity,transform' });
        const success = card.querySelector('.recovery-step-icon-success');
        if (success) gsap.fromTo(success, { scale: .88, rotation: -8 }, { scale: 1, rotation: 0, duration: .5, ease: 'power3.out', clearProps: 'transform' });
      }) as (card: HTMLElement) => void;
      const observer = new MutationObserver(records => {
        for (const record of records) {
          const card = record.target as HTMLElement;
          if (record.oldValue !== card.getAttribute('data-auth-step')) revealStep(card);
        }
      });
      observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-auth-step'], attributeOldValue: true });
      root.addEventListener('pointerover', onOver);
      root.addEventListener('pointerout', onOut);
      root.addEventListener('pointerdown', onDown);
      root.addEventListener('focusin', onFocus);
      root.addEventListener('focusout', onBlur);
      root.addEventListener('keydown', onKeyDown);
      document.addEventListener('pointerup', release);
      document.addEventListener('pointercancel', release);
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', release);
      return () => {
        observer.disconnect();
        root.removeEventListener('pointerover', onOver);
        root.removeEventListener('pointerout', onOut);
        root.removeEventListener('pointerdown', onDown);
        root.removeEventListener('focusin', onFocus);
        root.removeEventListener('focusout', onBlur);
        root.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('pointerup', release);
        document.removeEventListener('pointercancel', release);
        document.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', release);
      };
    }, root);
    return () => media.revert();
  }, { scope: rootRef });
}
