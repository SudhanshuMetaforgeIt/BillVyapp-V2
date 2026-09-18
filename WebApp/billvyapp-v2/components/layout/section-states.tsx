'use client';

import type { HTMLAttributes, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SectionStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  actionLabel?: string;
};

export function SectionEmptyState({
  title = 'Nothing here yet',
  message,
  className,
}: SectionStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-4 py-10 text-center',
        className,
      )}
    >
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
    </div>
  );
}

export function SectionErrorState({
  title = 'Unable to load',
  message,
  onRetry,
  actionLabel = 'Retry',
  className,
}: SectionStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

type DashboardSectionCardProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
} & HTMLAttributes<HTMLElement>;

export function DashboardSectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
  ...rest
}: DashboardSectionCardProps) {
  return (
    <section
      className={cn('app-surface-card overflow-hidden', className)}
      {...rest}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-ivory-soft/50 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-text">{title}</h2>
        {action}
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
