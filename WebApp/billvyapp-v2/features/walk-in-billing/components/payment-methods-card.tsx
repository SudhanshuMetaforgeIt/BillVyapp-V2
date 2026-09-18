'use client';

import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WalkInPaymentMethod } from '../types/walk-in-billing.types';

const METHODS: Array<{
  id: WalkInPaymentMethod;
  label: string;
  description: string;
  icon: typeof Smartphone;
}> = [
  {
    id: 'UPI',
    label: 'UPI',
    description: 'Pay using UPI Apps',
    icon: Smartphone,
  },
  {
    id: 'CASH',
    label: 'Cash',
    description: 'Pay with cash',
    icon: Banknote,
  },
  {
    id: 'CARD',
    label: 'Card',
    description: 'Debit / Credit Card',
    icon: CreditCard,
  },
  {
    id: 'WALLET',
    label: 'Wallet',
    description: 'Pay using Wallet',
    icon: Wallet,
  },
];

type PaymentMethodsCardProps = {
  value: WalkInPaymentMethod;
  onChange: (value: WalkInPaymentMethod) => void;
  onPay: () => void;
  onReset: () => void;
  canPay: boolean;
  isPaying: boolean;
};

export function PaymentMethodsCard({
  value,
  onChange,
  onPay,
  onReset,
  canPay,
  isPaying,
}: PaymentMethodsCardProps) {
  return (
    <section className="app-surface-card p-5">
      <h2 className="mb-4 text-base font-semibold text-text">Payment Methods</h2>

      <ul className="space-y-2">
        {METHODS.map((method) => {
          const Icon = method.icon;
          const selected = value === method.id;
          return (
            <li key={method.id}>
              <button
                type="button"
                onClick={() => onChange(method.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
                  selected
                    ? 'border-champagne bg-champagne-light/60 shadow-sm'
                    : 'border-border bg-surface hover:border-champagne/40',
                )}
                aria-pressed={selected}
              >
                <span
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
                    selected
                      ? 'border-champagne bg-champagne'
                      : 'border-border bg-white',
                  )}
                  aria-hidden
                >
                  {selected ? (
                    <span className="size-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text">
                    {method.label}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {method.description}
                  </span>
                </span>
                <Icon className="size-4 shrink-0 text-text-secondary" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        className="mt-5 h-11 w-full bg-champagne text-white hover:bg-champagne/90"
        disabled={!canPay || isPaying}
        onClick={onPay}
      >
        {isPaying ? 'Processing…' : 'Proceed to Pay'}
      </Button>

      <button
        type="button"
        className="mt-3 w-full text-center text-sm font-medium text-brand-orange hover:underline disabled:opacity-50"
        onClick={onReset}
        disabled={isPaying}
      >
        Reset
      </button>
    </section>
  );
}
