'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateMembershipPlan } from '../hooks/use-membership-mutations';

type AddPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
};

export function AddPlanDialog({
  open,
  onOpenChange,
  salonId,
}: AddPlanDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('365');

  const create = useCreateMembershipPlan(() => {
    onOpenChange(false);
    setName('');
    setDescription('');
    setPrice('');
    setDurationDays('365');
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const priceNum = Number(price);
  const days = Number.parseInt(durationDays, 10);
  const canSubmit =
    Boolean(salonId) &&
    name.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum >= 0 &&
    Number.isInteger(days) &&
    days >= 1;

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
              Add Plan
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create a membership plan for your salon.
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
              salonId,
              name: name.trim(),
              description: description.trim() || null,
              price: priceNum,
              durationDays: days,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">Name</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gold Annual"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-desc">Description (optional)</Label>
            <Input
              id="plan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Price</Label>
              <Input
                id="plan-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="4999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-days">Duration (days)</Label>
              <Input
                id="plan-days"
                inputMode="numeric"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
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
              {create.isPending ? 'Creating…' : 'Create plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
