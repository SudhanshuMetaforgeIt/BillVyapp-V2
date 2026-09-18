'use client';

import { useEffect, useId, useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMembership } from '../hooks/use-membership-mutations';

type AddMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planOptions: Array<{ id: string; name: string }>;
  customerOptions: Array<{ id: string; name: string; phone: string }>;
};

export function AddMemberDialog({
  open,
  onOpenChange,
  planOptions,
  customerOptions,
}: AddMemberDialogProps) {
  const titleId = useId();
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const create = useCreateMembership(() => {
    onOpenChange(false);
  });

  useEffect(() => {
    if (!open) return;
    setCustomerId(customerOptions[0]?.id ?? '');
    setPlanId(planOptions[0]?.id ?? '');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
  }, [open, customerOptions, planOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const canSubmit = Boolean(customerId) && Boolean(planId) && Boolean(startDate);

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
              Add Member
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Assign a membership plan to an existing customer.
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

        {customerOptions.length === 0 || planOptions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {customerOptions.length === 0
              ? 'No customers available. Add a customer first.'
              : 'No membership plans available. Create a plan first.'}
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || create.isPending) return;
              create.mutate({
                customerId,
                membershipPlanId: planId,
                startDate,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="mem-customer">Customer</Label>
              <select
                id="mem-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.phone ? ` · ${customer.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mem-plan">Membership plan</Label>
              <select
                id="mem-plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                {planOptions.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mem-start">Start date</Label>
              <Input
                id="mem-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                {create.isPending ? 'Adding…' : 'Add member'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
