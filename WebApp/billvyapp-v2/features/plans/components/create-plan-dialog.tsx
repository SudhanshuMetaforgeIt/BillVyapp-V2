'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BillingCycle, PlatformPlan, PlanStatus } from '../types/plans.types';

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
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const canSubmit =
    name.trim().length > 0 && (isCustom || (price.trim().length > 0 && Number(price) >= 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card w-full max-w-md overflow-hidden shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/80 bg-ivory-soft/50 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-text">
            {isEdit ? 'Edit Plan' : 'Add New Plan'}
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            toast(
              isEdit
                ? 'Plan updates will save once the plans API is available.'
                : 'Plan creation will save once the plans API is available.',
            );
            onOpenChange(false);
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
              <Label htmlFor="plan-price">Monthly price (₹)</Label>
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
            <select
              id="plan-cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <Label htmlFor="plan-status">Status</Label>
            <select
              id="plan-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PlanStatus)}
              className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-brand-orange text-white hover:bg-brand-orange-deep"
            >
              {isEdit ? 'Save changes' : 'Create plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
