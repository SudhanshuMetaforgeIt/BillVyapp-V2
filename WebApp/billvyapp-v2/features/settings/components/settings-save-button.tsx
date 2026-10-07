'use client';

import type { ComponentProps } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SettingsSaveButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children'
> & {
  saving: boolean;
  label?: string;
};

export function SettingsSaveButton({
  saving,
  label = 'Save Changes',
  disabled,
  className,
  ...props
}: SettingsSaveButtonProps) {
  return (
    <Button
      {...props}
      type="button"
      disabled={disabled || saving}
      aria-busy={saving}
      className={cn(
        'group/settings-save relative min-w-36 overflow-hidden bg-brand-orange px-4 text-white shadow-sm hover:bg-brand-orange-dark hover:shadow-md motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] motion-reduce:transition-none',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover/settings-save:translate-x-full motion-reduce:hidden"
      />
      {saving ? (
        <LoaderCircle
          aria-hidden="true"
          className="relative size-4 motion-safe:animate-spin"
        />
      ) : (
        <Save aria-hidden="true" className="relative size-4" />
      )}
      <span className="relative" aria-live="polite">
        {saving ? 'Saving…' : label}
      </span>
    </Button>
  );
}
