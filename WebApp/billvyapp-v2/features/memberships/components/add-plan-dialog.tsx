'use client';
import { getBusinessRegion } from '@/lib/business-region';
import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SalonPicker } from '@/features/salons/components/salon-picker';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { useSaveMembershipPlan } from '../hooks/use-membership-mutations';
import { fetchMembershipServices } from '../services/memberships.service';
import type { MembershipPlanApiItem } from '../types/memberships.types';

export function AddPlanDialog({
  open,
  onOpenChange,
  salonId,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  plan?: MembershipPlanApiItem;
}) {
  const titleId = useId();
  const [selectedSalon, setSelectedSalon] = useState(plan?.salonId ?? salonId);
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [price, setPrice] = useState(plan?.price ?? '');
  const [durationDays, setDurationDays] = useState(
    String(plan?.durationDays ?? 90),
  );
  const [threshold, setThreshold] = useState(plan?.enrollmentThreshold ?? '');
  const [benefits, setBenefits] = useState(plan?.benefits ?? '');
  const [benefitType, setBenefitType] = useState<
    'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT'
  >(plan?.benefitType ?? 'NONE');
  const [perVisit, setPerVisit] = useState(plan?.freeServicesPerVisit ?? !plan);
  const [freeLimit, setFreeLimit] = useState(
    String(plan?.freeServiceLimit ?? 5),
  );
  const [percentage, setPercentage] = useState(
    String(plan?.discountPercentage ?? 10),
  );
  const [usageLimit, setUsageLimit] = useState(
    plan
      ? plan.couponUsageLimit == null
        ? ''
        : String(plan.couponUsageLimit)
      : '5',
  );
  const [terms, setTerms] = useState(plan?.termsAndConditions ?? '');
  const [active, setActive] = useState(plan?.isActive ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(
    plan?.eligibleServices?.map((s) => s.id) ?? [],
  );
  const save = useSaveMembershipPlan(() => onOpenChange(false));
  const services = useScopedQuery(
    ['memberships', 'services', selectedSalon],
    () => fetchMembershipServices(selectedSalon),
    {
      enabled: open && Boolean(selectedSalon),
      placeholderData: undefined,
    },
  );
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !save.isPending) onOpenChange(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onOpenChange, save.isPending]);
  if (!open) return null;
  const validMoney = (value: string) =>
    /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 9999999999.99;
  const valid =
    selectedSalon &&
    name.trim() &&
    validMoney(price) &&
    /^\d+$/.test(durationDays) &&
    Number(durationDays) > 0 &&
    (!threshold || validMoney(threshold)) &&
    (benefitType === 'NONE' || serviceIds.length > 0) &&
    (benefitType !== 'FREE_SERVICES' ||
      perVisit ||
      (/^\d+$/.test(freeLimit) &&
        Number(freeLimit) >= 1 &&
        Number(freeLimit) <= 2147483647)) &&
    (benefitType !== 'PERCENTAGE_DISCOUNT' ||
      (/^\d+(?:\.\d{1,2})?$/.test(percentage) &&
        Number(percentage) >= 0 &&
        Number(percentage) <= 100)) &&
    (!usageLimit ||
      (/^\d+$/.test(usageLimit) &&
        Number(usageLimit) >= 1 &&
        Number(usageLimit) <= 2147483647)) &&
    (benefitType !== 'FREE_SERVICES' || !perVisit || Number(usageLimit) >= 1) &&
    !services.isError &&
    !services.isLoading;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-dialog app-surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 shadow-xl"
      >
        <div className="mb-4 flex justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {plan ? 'Edit membership plan' : 'Create membership plan'}
          </h2>
          <button
            aria-label="Close"
            disabled={save.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid || save.isPending) return;
            save.mutate({
              id: plan?.id,
              payload: {
                salonId: selectedSalon,
                name: name.trim(),
                description: description.trim() || null,
                price: Number(price),
                durationDays: Number(durationDays),
                enrollmentThreshold: threshold ? Number(threshold) : null,
                benefits: benefits.trim() || null,
                couponUsageLimit: usageLimit ? Number(usageLimit) : null,
                termsAndConditions: terms.trim() || null,
                benefitType,
                freeServicesPerVisit:
                  benefitType === 'FREE_SERVICES' && perVisit,
                freeServiceLimit:
                  benefitType === 'FREE_SERVICES' && !perVisit
                    ? Number(freeLimit)
                    : null,
                discountPercentage:
                  benefitType === 'PERCENTAGE_DISCOUNT'
                    ? Number(percentage)
                    : null,
                eligibleServiceIds: serviceIds,
                isActive: active,
              },
            });
          }}
        >
          {!plan && (
            <SalonPicker
              value={selectedSalon}
              onChange={(id) => {
                setSelectedSalon(id);
                setServiceIds([]);
              }}
            />
          )}
          {plan && (
            <p className="text-sm text-text-secondary">
              Salon: {plan.salonName ?? plan.salonId}
            </p>
          )}
          <Label htmlFor="plan-name">Membership name</Label>
          <Input
            id="plan-name"
            value={name}
            maxLength={191}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Label htmlFor="plan-desc">Description</Label>
          <Input
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 panel-md:grid-cols-2">
            <div>
              <Label htmlFor="plan-price">
                Price ({getBusinessRegion().currency})
              </Label>
              <Input
                id="plan-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="plan-days">Validity (calendar days)</Label>
              <Input
                id="plan-days"
                inputMode="numeric"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
              />
            </div>
          </div>
          <Label htmlFor="plan-threshold">
            Billing offer threshold ({getBusinessRegion().currency})
          </Label>
          <Input
            id="plan-threshold"
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Leave blank to exclude from billing offers"
          />
          <Label htmlFor="plan-benefits">Membership benefits</Label>
          <textarea
            id="plan-benefits"
            className="w-full rounded-md border border-border p-2 text-sm"
            value={benefits}
            maxLength={10000}
            onChange={(e) => setBenefits(e.target.value)}
          />
          <p className="text-sm text-text-secondary">
            Coupon codes use the salon’s franchise code automatically.
          </p>
          <Label htmlFor="plan-usage-limit">
            Coupon usable for how many visits?
          </Label>
          <Input
            id="plan-usage-limit"
            type="number"
            min={1}
            step={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="No additional visit limit"
          />
          <p className="text-sm text-text-secondary">
            One use = one completed bill receiving a membership benefit, even
            with multiple services. Drafts and visits without a benefit do not
            count. A visit cap is required for free services per visit. For
            other rules, leave blank for no additional visit cap.
          </p>
          <Label htmlFor="plan-terms">Terms &amp; Conditions</Label>
          <textarea
            id="plan-terms"
            className="w-full rounded-md border p-2 text-sm"
            rows={4}
            maxLength={10000}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Enter the membership terms customers should know"
          />
          <Label htmlFor="plan-benefit-type">Benefit type</Label>
          <select
            id="plan-benefit-type"
            className="w-full rounded-md border p-2"
            value={benefitType}
            onChange={(e) =>
              setBenefitType(e.target.value as typeof benefitType)
            }
          >
            <option value="NONE">
              No pricing benefit (legacy / informational)
            </option>
            <option value="FREE_SERVICES">Free services</option>
            <option value="PERCENTAGE_DISCOUNT">Percentage discount</option>
          </select>
          {benefitType === 'FREE_SERVICES' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={perVisit}
                onChange={(e) => setPerVisit(e.target.checked)}
              />
              Free eligible services on each allowed visit (once per service per
              visit)
            </label>
          )}
          {benefitType === 'FREE_SERVICES' && !perVisit && (
            <>
              <Label htmlFor="plan-free-limit">
                Free service allowance per membership
              </Label>
              <Input
                id="plan-free-limit"
                type="number"
                min={1}
                step={1}
                value={freeLimit}
                onChange={(e) => setFreeLimit(e.target.value)}
              />
            </>
          )}
          {benefitType === 'PERCENTAGE_DISCOUNT' && (
            <>
              <Label htmlFor="plan-percentage">
                Discount percentage (0–100)
              </Label>
              <Input
                id="plan-percentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
              />
            </>
          )}
          <p className="text-sm text-text-secondary">
            Pricing rules apply only to selected eligible services. With free
            services per visit, each selected service is free once per completed
            benefit bill until the visit cap or expiry. Extra quantities use
            normal prices. With a shared allowance, free units are counted
            across visits.
          </p>
          <fieldset className="app-service-list space-y-2 rounded-md border border-border p-3">
            <legend className="text-sm font-medium">Eligible services</legend>
            {!selectedSalon && (
              <p className="text-sm">Select a salon to load services.</p>
            )}
            {services.isLoading && (
              <p className="text-sm">Loading services...</p>
            )}
            {services.isError && (
              <p role="alert">
                Could not load services.{' '}
                <button type="button" onClick={() => void services.refetch()}>
                  Retry
                </button>
              </p>
            )}
            {services.data?.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={(e) =>
                    setServiceIds((ids) =>
                      e.target.checked
                        ? [...ids, s.id]
                        : ids.filter((id) => id !== s.id),
                    )
                  }
                />
                {s.name}
              </label>
            ))}
            {selectedSalon && services.isSuccess && !services.data?.length && (
              <p className="text-sm">No services in this salon.</p>
            )}
          </fieldset>
          {!plan && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active plan
            </label>
          )}
          {plan && (
            <p className="text-xs text-text-secondary">
              Issued memberships retain their enrollment terms. Change
              activation using the plan list.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? 'Saving...' : 'Save plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
