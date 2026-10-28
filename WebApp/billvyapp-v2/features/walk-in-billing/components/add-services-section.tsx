'use client';
import { BillingGenderSelector } from './billing-gender-selector';
import type { Gender } from '@/lib/gender';
import { genderLabel } from '@/lib/gender';

import { getCurrencySymbol } from '@/lib/business-region';

import { SelectInput } from '@/components/data/form-fields';

import { Minus, Plus, Search, Trash2 } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsToggle } from '@/features/settings/components/settings-toggle';
import { formatCurrency } from '@/lib/format';
import {
  useSalonServices,
  useServiceCategories,
} from '../hooks/use-service-catalog';
import type {
  CartLine,
  SalonService,
  BillPreview,
} from '../types/walk-in-billing.types';

type AddServicesSectionProps = {
  gender: Gender | "";
  onGenderChange: (gender: Gender | "") => void;
  enabled: boolean;
  salonId: string;
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  cart: CartLine[];
  membershipPricing?: BillPreview['membershipPricing'];
  onAddService: (service: SalonService) => void;
  onChangeQty: (serviceId: string, quantity: number) => void;
  onRemove: (serviceId: string) => void;
  stylistName: string;
  onStylistNameChange: (value: string) => void;
  applyDiscount: boolean;
  onApplyDiscountChange: (value: boolean) => void;
  discountAmount: string;
  discountMode: 'amount' | 'percentage';
  onDiscountModeChange: (value: 'amount' | 'percentage') => void;
  discountInvalid: boolean;
  onDiscountAmountChange: (value: string) => void;
};

export function AddServicesSection({
  gender, onGenderChange,
  enabled,
  salonId,
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  cart,
  membershipPricing,
  onAddService,
  onChangeQty,
  onRemove,
  stylistName,
  onStylistNameChange,
  applyDiscount,
  onApplyDiscountChange,
  discountAmount,
  discountMode,
  onDiscountModeChange,
  discountInvalid,
  onDiscountAmountChange,
}: AddServicesSectionProps) {
  const categories = useServiceCategories(enabled && Boolean(gender), salonId, gender || undefined);
  const services = useSalonServices(enabled && Boolean(gender), { search, categoryId, salonId, gender: gender || undefined });
  const matchingServices = (services.data?.data ?? []).filter(service => service.gender === gender);

  return (
    <section className="app-panel app-surface-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
          2
        </span>
        <h2 className="text-base font-semibold text-text">Add Services</h2>
      </div>

      <BillingGenderSelector value={gender} onChange={onGenderChange} disabled={!enabled} />
      <div className="mt-3 grid gap-3 panel-md:grid-cols-2">
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Services"
            className="h-10 pr-9"
            aria-label="Search services"
          />
          <Search
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
        </div>
        <SelectInput
          className="h-10 w-auto min-w-[9rem] text-sm font-medium"
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Service category"
        >
          <option value="">All Categories</option>
          {(categories.data?.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectInput>
      </div>

      <div className="mt-4 min-h-40 rounded-xl border border-border/80">
        {!enabled ? (
          <SectionEmptyState message="Select a customer before adding services." />
        ) : !gender ? (<SectionEmptyState message="Select a gender to see services." />) : services.isLoading || categories.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : services.isError ? (
          <SectionErrorState
            message="Could not load services."
            onRetry={() => void services.refetch()}
          />
        ) : matchingServices.length === 0 && cart.length === 0 ? (
          <SectionEmptyState message={`No active ${genderLabel(gender).toLowerCase()} services match these filters. Set service genders on the Services page.`} />
        ) : (
          <div className="divide-y divide-border/70">
            {cart.length > 0 ? (
              <ul>
                {cart.map((line) => (
                  <li
                    key={line.serviceId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {line.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatCurrency(line.unitPrice)} · tax {line.taxRate}%
                      </p>
                      {(membershipPricing?.[line.serviceId]?.discount ?? 0) >
                        0 && (
                        <p className="text-xs text-emerald">
                          Membership benefit: −
                          {formatCurrency(
                            membershipPricing![line.serviceId].discount,
                          )}{' '}
                          ({membershipPricing![line.serviceId].units} units) ·
                          Final before tax:{' '}
                          {formatCurrency(
                            membershipPricing![line.serviceId].final,
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border"
                        onClick={() =>
                          onChangeQty(line.serviceId, line.quantity - 1)
                        }
                        aria-label={`Decrease ${line.name}`}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border"
                        onClick={() =>
                          onChangeQty(line.serviceId, line.quantity + 1)
                        }
                        aria-label={`Increase ${line.name}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-danger"
                        onClick={() => onRemove(line.serviceId)}
                        aria-label={`Remove ${line.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {matchingServices
              .filter(
                (service) =>
                  !cart.some((line) => line.serviceId === service.id),
              )
              .slice(0, 8)
              .map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-champagne-light/40"
                  onClick={() => onAddService(service)}
                >
                  <span>
                    <span className="block text-sm font-medium text-text">
                      {service.name}
                    </span>
                    <span className="block text-xs text-text-secondary">
                      {formatCurrency(service.price)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-champagne">
                    Add
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 border-t border-border/70 pt-4 content-lg:grid-cols-[minmax(0,1fr)_auto] content-lg:items-end">
        <div className="space-y-1.5">
          <label
            htmlFor="stylist-name"
            className="text-xs font-medium text-text-secondary"
          >
            Stylist Name
          </label>
          <Input
            id="stylist-name"
            value={stylistName}
            onChange={(e) => onStylistNameChange(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 pb-1">
          <div className="flex items-center gap-2">
            <SettingsToggle
              id="apply-discount"
              label="Apply Discount"
              checked={applyDiscount}
              onCheckedChange={onApplyDiscountChange}
            />
            <span className="text-sm text-text">Apply Discount</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 content-lg:col-span-2">
          <div className="space-y-1.5">
            <label htmlFor="discount-mode" className="text-xs font-medium text-text-secondary">Discount type</label>
            <SelectInput id="discount-mode" value={discountMode} disabled={!applyDiscount} onChange={(event) => onDiscountModeChange(event.target.value as 'amount' | 'percentage')}>
              <option value="amount">Amount ({getCurrencySymbol()})</option>
              <option value="percentage">Percentage (%)</option>
            </SelectInput>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="discount-amount"
              className="text-xs font-medium text-text-secondary"
            >
              Discount ({discountMode === 'percentage' ? '%' : getCurrencySymbol()})
            </label>
            <Input
              id="discount-amount"
              type="number"
              min={0}
              max={discountMode === 'percentage' ? 100 : undefined}
              step="0.01"
              aria-invalid={discountInvalid}
              aria-describedby={discountInvalid ? 'discount-error' : undefined}
              inputMode="decimal"
              value={discountAmount}
              onChange={(e) => onDiscountAmountChange(e.target.value)}
              disabled={!applyDiscount}
              className="w-28"
              placeholder="0"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="mb-0.5"
            disabled={!applyDiscount || !discountAmount.trim() || discountInvalid}
            onClick={() => onApplyDiscountChange(true)}
          >
            Apply
          </Button>
        </div>
        {discountInvalid && <p id="discount-error" role="alert" className="text-xs text-danger content-lg:col-span-2">{discountMode === 'percentage' ? 'Enter a percentage between 0 and 100.' : 'Enter a valid non-negative discount amount.'}</p>}
        {applyDiscount && discountMode === 'percentage' && <p className="text-xs text-text-secondary content-lg:col-span-2">Percentage applies to the service subtotal after membership benefits, before tax and membership fees.</p>}
      </div>
    </section>
  );
}
