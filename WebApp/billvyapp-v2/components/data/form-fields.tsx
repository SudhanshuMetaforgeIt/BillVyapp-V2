'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';

import { Label } from '@/components/ui/label';
import { describeApiError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

export function FormField({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/** Inline mutation error, including every DTO field message the backend returned. */
export function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  const described = describeApiError(error);
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger"
    >
      <p className="font-medium">{described.message}</p>
      {described.details && described.details.length > 1 ? (
        <ul className="mt-1 list-disc pl-4 text-xs">
          {described.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
