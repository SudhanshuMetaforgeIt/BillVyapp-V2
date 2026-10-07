'use client';
import * as React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { phoneCallingCode, type PhoneCountry } from '@/lib/phone';

import { cn } from '@/lib/utils';
import { AppSelect } from '@/components/ui/app-select';

function Input({
  className,
  type,
  phoneCountry,
  onPhoneCountryChange,
  ...props
}: React.ComponentProps<'input'> & {
  phoneCountry?: PhoneCountry;
  onPhoneCountryChange?: (country: PhoneCountry) => void;
}) {
  const inheritedCountry = useAuthStore((state) => state.user?.phoneCountry);
  const showPrefix =
    type === 'tel' &&
    !String(props.value ?? props.defaultValue ?? '').startsWith('+');
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
        showPrefix && (onPhoneCountryChange ? 'pl-24' : 'pl-14'),
      )}
      {...props}
    />
  );
  return showPrefix ? (
    <div className="relative w-full">
      {onPhoneCountryChange ? (
        <>
          <div className="absolute inset-y-1 left-1 z-10 flex w-18 items-center">
            <AppSelect
              aria-label="Phone country"
              size="sm"
              className="h-9 min-h-9 w-full rounded-md border-0 bg-transparent px-2 text-sm shadow-none hover:bg-champagne-light/40 focus-visible:ring-2"
              value={phoneCountry ?? 'IN'}
              disabled={props.disabled}
              onValueChange={(value) =>
                onPhoneCountryChange(value as PhoneCountry)
              }
              options={[
                { value: 'IN', label: '+91' },
                { value: 'US', label: '+1' },
              ]}
            />
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-3 left-20 border-l border-border/70"
          />
        </>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center bg-background text-sm text-muted-foreground"
        >
          {phoneCallingCode(phoneCountry ?? inheritedCountry ?? 'IN')}
        </span>
      )}
      {input}
    </div>
  ) : (
    input
  );
}

export { Input };
