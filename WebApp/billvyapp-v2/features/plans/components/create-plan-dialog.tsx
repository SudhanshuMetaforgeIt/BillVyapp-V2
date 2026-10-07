'use client';

import { getCurrencySymbol } from '@/lib/business-region';

import { SelectInput } from '@/components/data/form-fields';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePlan, useUpdatePlan } from '../hooks/use-plan-mutations';
import type {
  BillingCycle,
  PlatformPlan,
  PlanStatus,
} from '../types/plans.types';

type CreatePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPlan?: PlatformPlan | null;
};

export function CreatePlanDialog({
  open,
  onOpenChange,
  editPlan = null,
}: CreatePlanDialogProps) {
  const titleId = useId();
  const isEdit = Boolean(editPlan);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [status, setStatus] = useState<PlanStatus>('active');

  const close = () => onOpenChange(false);

  const create = useCreatePlan(close);
  const update = useUpdatePlan(close);
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (editPlan) {
      setName(editPlan.name);
      setPrice(
        editPlan.priceMonthly === null ? '' : String(editPlan.priceMonthly),
      );
      setIsCustom(editPlan.isCustom);
      setBillingCycle(editPlan.billingCycle);
      setStatus(editPlan.status);
      return;
    }
    setName('');
    setPrice('');
    setIsCustom(false);
    setBillingCycle('monthly');
    setStatus('active');
  }, [open, editPlan]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, pending]);

  if (!open) return null;

  const canSubmit =
    name.trim().length > 0 &&
    (isCustom || (price.trim().length > 0 && Number(price) >= 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/80 bg-ivory-soft/50 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-text">
            {isEdit ? 'Edit Plan' : 'Add New Plan'}
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Close"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || pending) return;
            const payload = {
              name: name.trim(),
              priceMonthly: isCustom ? null : Number(price),
              billingCycle,
              isCustom,
              status,
            };
            if (isEdit && editPlan) {
              update.mutate({
                id: editPlan.id,
                payload,
                previousStatus: editPlan.status,
              });
              return;
            }
            create.mutate(payload);
          }}
        >
          <div>
            <Label htmlFor="plan-name">Plan name</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Professional"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isCustom}
              onChange={(e) => setIsCustom(e.target.checked)}
              className="size-4 rounded border-border"
            />
            Custom pricing (contact sales)
          </label>

          {!isCustom ? (
            <div>
              <Label htmlFor="plan-price">
                Monthly price ({getCurrencySymbol()})
              </Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1199"
                required
              />
            </div>
          ) : null}

          <div>
            <Label htmlFor="plan-cycle">Billing cycle</Label>
            <SelectInput
              className="h-11 w-full text-sm font-medium"
              id="plan-cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </SelectInput>
          </div>

          <div>
            <Label htmlFor="plan-status">Status</Label>
            <SelectInput
              className="h-11 w-full text-sm font-medium"
              id="plan-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PlanStatus)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectInput>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || pending}
              className="bg-brand-orange text-white hover:bg-brand-orange-deep"
            >
              {pending
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save changes'
                  : 'Create plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
