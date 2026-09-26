'use client';

import { AlertTriangle, Lock, SearchX, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { describeApiError, isTerminalError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

type QueryErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  className?: string;
};

/**
 * Status-aware error panel for any API-backed section: 403 and 404 are shown
 * as final states without a retry, network and 5xx failures offer one.
 */
export function QueryErrorState({ error, onRetry, className }: QueryErrorStateProps) {
  const described = describeApiError(error);
  const Icon =
    described.kind === 'forbidden'
      ? Lock
      : described.kind === 'not-found'
        ? SearchX
        : described.kind === 'network'
          ? WifiOff
          : AlertTriangle;
  const canRetry = onRetry && !isTerminalError(described.kind);

  return (
    <div
      role="alert"
      data-error-kind={described.kind}
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-10 text-center',
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-text-secondary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-text">{described.title}</p>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{described.message}</p>
      </div>
      {canRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
