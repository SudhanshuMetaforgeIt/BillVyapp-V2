'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

type BrandLogoProps = {
  /** Dark panel uses the black-background lockup; light card uses the white one. */
  variant: 'dark' | 'light';
  className?: string;
  priority?: boolean;
  /**
   * Compact crop hides the tagline for tight placements (login card header).
   * Full shows icon + wordmark + "SMARTER BUSINESS".
   */
  size?: 'full' | 'compact';
  /** Override the default asset for this variant. */
  src?: string;
};

const LOGO_SRC = {
  dark: '/billvyapp_logo.png',
  light: '/billvyapp_w_logo.png',
} as const;

export function BrandLogo({
  variant,
  className,
  priority = false,
  size = 'full',
  src,
}: BrandLogoProps) {
  const isCompact = size === 'compact';
  const imageSrc = src ?? LOGO_SRC[variant];
  const isSquareLockup = imageSrc === '/billvyapp_logo.png';

  return (
    <div
      className={cn(
        'relative max-w-full overflow-hidden',
        isSquareLockup
          ? isCompact
            ? 'h-16 w-16 sm:h-20 sm:w-20'
            : 'h-28 w-28 @min-[20rem]/branding:h-36 @min-[20rem]/branding:w-36 @min-[28rem]/branding:h-44 @min-[28rem]/branding:w-44'
          : isCompact
            ? 'h-14 w-36 sm:h-16 sm:w-40'
            : 'h-24 w-40 sm:h-28 sm:w-44',
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt="BillVyApp"
        fill
        priority={priority}
        className={cn(
          'object-contain',
          isSquareLockup
            ? 'object-center'
            : variant === 'dark'
              ? 'object-left'
              : 'object-center',
          isCompact && !isSquareLockup && 'object-top',
        )}
        sizes={
          isSquareLockup
            ? isCompact
              ? '96px'
              : '176px'
            : isCompact
              ? '176px'
              : '208px'
        }
      />
    </div>
  );
}
