'use client';

import { cn } from '@/lib/utils';

type StatusBadgeProps = {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'info';
  className?: string;
};

const TONE_CLASS: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  success: 'bg-emerald-light text-emerald',
  warning: 'bg-[color-mix(in_srgb,var(--bv-warning)_12%,white)] text-warning',
  danger: 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger',
  neutral: 'bg-muted text-text-secondary',
  accent: 'bg-champagne-light text-charcoal',
  info: 'bg-[#e8eef8] text-[#35507a]',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
