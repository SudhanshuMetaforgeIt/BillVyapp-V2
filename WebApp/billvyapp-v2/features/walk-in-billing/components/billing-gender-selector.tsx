'use client';

import { Check, Mars, UserRound, UsersRound, Venus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Gender } from '@/lib/gender';

const choices = [
  { value: 'MALE', label: 'Male', icon: Mars },
  { value: 'FEMALE', label: 'Female', icon: Venus },
  { value: 'OTHER', label: 'Other', icon: UserRound },
  { value: 'UNISEX', label: 'Unisex', icon: UsersRound },
] as const;

export function BillingGenderSelector({ value, onChange, disabled }: {
  value: Gender | '';
  onChange: (value: Gender) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} aria-describedby="billing-gender-help" className="min-w-0 rounded-2xl border border-border/80 bg-ivory-soft/60 p-4">
      <legend className="px-2 text-sm font-semibold text-text">Gender <span className="text-brand-orange" aria-hidden>*</span></legend>
      <p id="billing-gender-help" className="mb-3 text-xs leading-relaxed text-text-secondary">
        {disabled ? 'Select a customer to choose their service gender.' : 'Choose a gender to explore matching services.'}
      </p>
      <div className="grid grid-cols-2 gap-2.5 panel-md:grid-cols-4">
        {choices.map(({ value: gender, label, icon: Icon }) => {
          const selected = value === gender;
          return (
            <div key={gender} className="relative min-w-0">
              <input id={`billing-gender-${gender}`} type="radio" name="billing-service-gender" value={gender} checked={selected}
                required onChange={() => onChange(gender)} className="peer sr-only" />
              <label htmlFor={`billing-gender-${gender}`} className={cn(
                'flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors motion-reduce:transition-none peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-champagne peer-focus-visible:ring-offset-2',
                disabled ? 'cursor-not-allowed border-border/60 bg-surface/60 text-text-muted' : 'cursor-pointer hover:border-champagne/60 hover:bg-surface',
                selected ? 'border-champagne bg-surface text-charcoal shadow-sm ring-1 ring-champagne/20' : 'border-border bg-surface/80 text-text-secondary',
              )}>
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-champagne-light text-charcoal' : 'bg-ivory text-text-secondary')}><Icon className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">{label}</span>
                {selected && <Check className="size-3.5 shrink-0 text-champagne" aria-hidden />}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
