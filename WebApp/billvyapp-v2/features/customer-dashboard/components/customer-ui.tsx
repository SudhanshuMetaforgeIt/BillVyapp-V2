'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, WifiOff } from 'lucide-react';

import { describeApiError, isTerminalError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

export const customerInput =
  'w-full rounded-xl border border-[#EDE5D8] bg-white px-3 py-2 text-sm text-[#1C1C1E] placeholder:text-[#9E9588] focus:border-[#FFB347] focus:outline-none disabled:bg-[#FAF7F2] disabled:text-[#8C8375]';

export const customerPrimaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF7B00] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E66F00] disabled:cursor-not-allowed disabled:opacity-60';

export const customerOutlineButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFD099] bg-white px-3 py-1.5 text-xs font-bold text-[#FF7B00] transition-colors hover:border-[#FF7B00] hover:bg-[#FFF7ED] disabled:cursor-not-allowed disabled:opacity-60';

export function CustomerPageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-[#7D766C] sm:text-sm">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CustomerCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-[#EDE5D8] bg-white p-4 shadow-2xs sm:p-5', className)}>
      {children}
    </div>
  );
}

export function CustomerLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-xs font-medium text-[#7D766C]" role="status">
      <Loader2 className="size-4 animate-spin text-[#FF7B00]" />
      {label}
    </div>
  );
}

export function CustomerEmpty({ icon, title, message, action }: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-3xl border border-dashed border-[#E5DDCF] bg-[#FAF7F2] p-10 text-center">
      {icon ? <div className="mx-auto flex justify-center text-[#C4A46C]">{icon}</div> : null}
      <h3 className="font-heading text-base font-bold text-[#1C1C1E]">{title}</h3>
      {message ? <p className="text-xs text-[#7D766C]">{message}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

/** Loading/401/403/404/validation/network/5xx copy comes from describeApiError. */
export function CustomerError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const described = describeApiError(error);
  const Icon = described.kind === 'network' ? WifiOff : AlertTriangle;
  return (
    <div className="space-y-2 rounded-3xl border border-[#F5C2BD] bg-[#FEF3F2] p-8 text-center" role="alert">
      <Icon className="mx-auto size-7 text-[#B42318]" />
      <h3 className="font-heading text-base font-bold text-[#1C1C1E]">{described.title}</h3>
      <p className="text-xs text-[#665E55]">{described.message}</p>
      {onRetry && !isTerminalError(described.kind) ? (
        <button type="button" onClick={onRetry} className={cn(customerOutlineButton, 'mt-2')}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function CustomerMutationError({ error }: { error: unknown }) {
  if (!error) return null;
  const described = describeApiError(error);
  return (
    <div className="rounded-xl border border-[#F5C2BD] bg-[#FEF3F2] p-3 text-xs text-[#B42318]" role="alert">
      <p className="font-semibold">{described.title}</p>
      <p className="mt-0.5">{described.message}</p>
      {described.details?.length ? (
        <ul className="mt-1 list-disc pl-4">
          {described.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CustomerPagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2 text-xs font-semibold text-[#4A453E]">
      <button
        type="button"
        className={customerOutlineButton}
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-3.5" />
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className={customerOutlineButton}
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}

const PILL_TONES = {
  success: 'bg-[#E8F8EE] text-[#15803D] border-[#BBE5CA]',
  warning: 'bg-[#FFF4E5] text-[#B45309] border-[#FFD8A8]',
  danger: 'bg-[#FEECEB] text-[#B42318] border-[#F5C2BD]',
  info: 'bg-[#E8F2FF] text-[#1D4ED8] border-[#C7DBFF]',
  neutral: 'bg-[#F4F1ED] text-[#665E55] border-[#E5DDCF]',
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function CustomerPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', PILL_TONES[tone])}>
      {label}
    </span>
  );
}

export function CustomerField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1">
      <span className="text-xs font-semibold text-[#4A453E]">{label}</span>
      {children}
    </label>
  );
}
