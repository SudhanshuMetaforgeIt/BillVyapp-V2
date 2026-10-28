'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from '@/lib/animations';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  decimals?: number;
  className?: string;
};

/** Only presentation changes: assistive technology always reads the actual value. */
export function AnimatedNumber({ value, format = formatNumber, decimals = 0, className }: AnimatedNumberProps) {
  const root = useRef<HTMLSpanElement>(null);
  const display = useRef<HTMLSpanElement>(null);
  const counter = useRef({ value: 0 });
  const label = format(value);

  useLayoutEffect(() => {
    const node = display.current;
    if (!node) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let tween: gsap.core.Tween | undefined;
    const animate = () => {
      tween?.kill();
      const render = () => {
        const precision = 10 ** decimals;
        node.textContent = format(Math.round(counter.current.value * precision) / precision);
      };
      if (media.matches || !Number.isFinite(value)) {
        counter.current.value = Number.isFinite(value) ? value : 0;
        node.textContent = label;
        return;
      }
      render();
      const frame = { value: counter.current.value };
      tween = gsap.to(frame, {
        value, duration: .85, ease: 'power2.out', overwrite: true,
        onUpdate: () => { counter.current.value = frame.value; render(); },
        onComplete: () => { node.textContent = label; },
      });
    };
    animate();
    media.addEventListener('change', animate);
    return () => {
      tween?.kill();
      media.removeEventListener('change', animate);
    };
  }, [value, label, format, decimals]);

  return (
    <span ref={root} className={cn('inline-grid tabular-nums', className)} data-animated-number={value}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>{label}</span>
      <span ref={display} className="col-start-1 row-start-1" aria-hidden>{label}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
