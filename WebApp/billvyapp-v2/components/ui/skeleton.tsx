import { cn } from '@/lib/utils';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[color-mix(in_srgb,var(--bv-charcoal)_8%,white)]',
        className,
      )}
      aria-hidden
    />
  );
}
