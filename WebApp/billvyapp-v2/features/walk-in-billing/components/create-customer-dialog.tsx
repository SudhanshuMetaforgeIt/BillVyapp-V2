'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCustomer } from '../hooks/use-create-customer';
import { normalizeIndianPhone } from '../lib/bill-preview';
import type { WalkInCustomer } from '../types/walk-in-billing.types';

type CreateCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  onCreated: (customer: WalkInCustomer) => void;
};

export function CreateCustomerDialog({
  open,
  onOpenChange,
  initialPhone = '',
  onCreated,
}: CreateCustomerDialogProps) {
  const titleId = useId();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(normalizeIndianPhone(initialPhone));

  const create = useCreateCustomer((customer) => {
    onCreated(customer);
    onOpenChange(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
  });

  useEffect(() => {
    if (open) {
      setPhone(normalizeIndianPhone(initialPhone));
    }
  }, [open, initialPhone]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const normalizedPhone = normalizeIndianPhone(phone);
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    normalizedPhone.length === 10;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card w-full max-w-md p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text">
              New customer
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create a customer to attach to this walk-in bill.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || create.isPending) return;
            create.mutate({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              phone: normalizedPhone,
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-first-name">First name</Label>
              <Input
                id="walkin-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-last-name">Last name</Label>
              <Input
                id="walkin-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="walkin-email">Email</Label>
            <Input
              id="walkin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="walkin-phone">Phone</Label>
            <Input
              id="walkin-phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              autoComplete="tel"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
