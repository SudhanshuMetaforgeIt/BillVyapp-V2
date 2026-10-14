'use client';

import { cn } from '@/lib/utils';

export function StatusSwitch({ checked, label, disabled, onCheckedChange }: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne disabled:opacity-50">
      <span aria-hidden="true" className={cn('relative block h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-champagne' : 'bg-muted')}>
        <span className={cn('absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform', checked && 'translate-x-4')} />
      </span>
    </button>
  );
}
