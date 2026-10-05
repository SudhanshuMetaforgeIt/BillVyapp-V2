'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

import { SelectInput } from '@/components/data/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { businessToday } from '@/lib/business-calendar';
import type { ApiError } from '@/types/api.types';
import { PLANS_QUERY_KEY } from '@/features/plans/hooks/use-plans';
import {
  enrollBusinessPlan,
  fetchActivePlatformPlans,
} from '../services/businesses.service';
import type { BusinessListRow } from '../types/businesses.types';
import { BUSINESSES_QUERY_KEY } from '../hooks/use-businesses';

type EnrollBusinessPlanDialogProps = {
  business: BusinessListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type BillingCycle = 'monthly' | 'yearly' | 'custom';

function todayIso(): string {
  return businessToday();
}

function addMonthsIso(months: number): string {
  const [y, m, d] = businessToday().split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, d));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

export function EnrollBusinessPlanDialog({
  business,
  open,
  onOpenChange,
}: EnrollBusinessPlanDialogProps) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [startsAt, setStartsAt] = useState(todayIso());
  const [endsAt, setEndsAt] = useState(addMonthsIso(1));
  const [notes, setNotes] = useState('');

  const plansQuery = useQuery({
    queryKey: ['platform-plans', 'active-options'],
    queryFn: fetchActivePlatformPlans,
    enabled: open,
  });

  useEffect(() => {
    if (!open || !business) return;
    setPlanId('');
    setBillingCycle('monthly');
    setStartsAt(todayIso());
    setEndsAt(addMonthsIso(1));
    setNotes('');
  }, [open, business]);

  useEffect(() => {
    if (billingCycle === 'monthly') {
      setStartsAt(todayIso());
      setEndsAt(addMonthsIso(1));
    } else if (billingCycle === 'yearly') {
      setStartsAt(todayIso());
      setEndsAt(addMonthsIso(12));
    }
  }, [billingCycle]);

  const enroll = useMutation({
    mutationFn: () =>
      enrollBusinessPlan({
        franchiseId: business!.id,
        platformPlanId: planId,
        billingCycle,
        startsAt,
        endsAt,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (sub) => {
      toast.success(`${business?.name} enrolled on ${sub.planName}`);
      void queryClient.invalidateQueries({ queryKey: BUSINESSES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !enroll.isPending) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, enroll.isPending]);

  if (!open || !business) return null;

  const canSubmit =
    Boolean(planId) &&
    Boolean(startsAt) &&
    Boolean(endsAt) &&
    endsAt >= startsAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !enroll.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-dialog app-surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border/80 bg-ivory-soft/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-text">
              Enroll / Change plan
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">{business.name}</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted"
            aria-label="Close"
            disabled={enroll.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || enroll.isPending) return;
            enroll.mutate();
          }}
        >
          <div>
            <Label htmlFor="enroll-plan">Platform plan</Label>
            <SelectInput
              id="enroll-plan"
              value={planId}
              disabled={plansQuery.isLoading || enroll.isPending}
              onChange={(e) => setPlanId(e.target.value)}
              required
            >
              <option value="">Select plan</option>
              {(plansQuery.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.isCustom ? ' (custom)' : ''}
                </option>
              ))}
            </SelectInput>
          </div>

          <div>
            <Label htmlFor="enroll-cycle">Billing cycle</Label>
            <SelectInput
              id="enroll-cycle"
              value={billingCycle}
              disabled={enroll.isPending}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom dates</option>
            </SelectInput>
          </div>

          <div className="grid gap-4 panel-md:grid-cols-2">
            <div>
              <Label htmlFor="enroll-starts">Starts on</Label>
              <Input
                id="enroll-starts"
                type="date"
                value={startsAt}
                disabled={enroll.isPending || billingCycle !== 'custom'}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="enroll-ends">Ends on</Label>
              <Input
                id="enroll-ends"
                type="date"
                value={endsAt}
                disabled={enroll.isPending || billingCycle !== 'custom'}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="enroll-notes">Notes (optional)</Label>
            <Input
              id="enroll-notes"
              value={notes}
              maxLength={500}
              disabled={enroll.isPending}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deal terms, invoice ref…"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={enroll.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || enroll.isPending}
              className="bg-brand-orange text-white hover:bg-brand-orange-deep"
            >
              {enroll.isPending ? 'Saving…' : 'Enroll business'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
