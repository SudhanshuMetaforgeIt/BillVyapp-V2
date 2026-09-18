'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandLogoProps = {
  /** Dark panel uses the black-background asset; light card uses the white one. */
  variant: 'dark' | 'light';
  className?: string;
  priority?: boolean;
  /**
   * Compact crop hides the tagline for tight placements (login card header).
   * Full shows icon + wordmark + "SMARTER BUSINESS".
   */
  size?: 'full' | 'compact';
};

const LOGO_SRC = {
  dark: '/billvyapp_b_logo.png',
  light: '/billvyapp_w_logo.png',
} as const;

export function BrandLogo({
  variant,
  className,
  priority = false,
  size = 'full',
}: BrandLogoProps) {
  const isCompact = size === 'compact';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        isCompact ? 'h-16 w-40 sm:h-[4.5rem] sm:w-44' : 'h-28 w-44 sm:h-32 sm:w-52',
        className,
      )}
    >
      <Image
        src={LOGO_SRC[variant]}
        alt="BillVyApp"
        fill
        priority={priority}
        className={cn(
          'object-contain',
          variant === 'dark' ? 'object-left' : 'object-center',
          isCompact && 'object-top scale-110',
        )}
        sizes={isCompact ? '176px' : '208px'}
      />
    </div>
  );
}
