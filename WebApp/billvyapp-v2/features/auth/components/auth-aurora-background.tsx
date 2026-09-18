'use client';

import { cn } from '@/lib/utils';

type AuthAuroraBackgroundProps = {
  className?: string;
  /** Softer blobs for the light form column */
  tone?: 'dark' | 'soft';
};

/**
 * Atmospheric orange/gold Aurora layers for auth pages.
 * Decorative only — no interaction, respects reduced motion via CSS.
 */
export function AuthAuroraBackground({
  className,
  tone = 'dark',
}: AuthAuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className={cn(
          'auth-aurora-base absolute inset-0',
          tone === 'dark' ? 'auth-aurora-base-dark' : 'auth-aurora-base-soft',
        )}
      />
      <div
        data-auth-animate="decor"
        className={cn(
          'auth-aurora-blob absolute -top-[20%] -left-[10%] h-[55%] w-[55%] rounded-full',
          tone === 'dark' ? 'bg-[#FF7B00]/25' : 'bg-[#FF7B00]/12',
        )}
      />
      <div
        data-auth-animate="decor"
        className={cn(
          'auth-aurora-blob absolute top-[30%] -right-[15%] h-[50%] w-[45%] rounded-full',
          tone === 'dark' ? 'bg-[#F55607]/20' : 'bg-[#F55607]/10',
        )}
      />
      <div
        data-auth-animate="decor"
        className={cn(
          'auth-aurora-blob absolute -bottom-[15%] left-[20%] h-[45%] w-[50%] rounded-full',
          tone === 'dark' ? 'bg-[#D4A017]/18' : 'bg-[#D4A017]/10',
        )}
      />
      <div
        data-auth-animate="decor"
        className="absolute inset-0 auth-aurora-arc"
      />
    </div>
  );
}
