'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Gem,
  MoreVertical,
  Octagon,
  Pencil,
  Send,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatNumber } from '@/lib/format';
import type {
  PaginationMeta,
  PlanIconKey,
  PlatformPlan,
} from '../types/plans.types';
import { PlansPagination } from './plans-pagination';

type PlansTableProps = {
  rows: PlatformPlan[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onEditPlan: (plan: PlatformPlan) => void;
};

const PLAN_ICONS: Record<PlanIconKey, LucideIcon> = {
  basic: Send,
  professional: Gem,
  premium: TrendingUp,
  enterprise: Building2,
  custom: Octagon,
};

const PLAN_ICON_WRAP: Record<PlanIconKey, string> = {
  basic: 'bg-[#e8eef8] text-[#35507a]',
  professional: 'bg-champagne-light text-champagne',
  premium: 'bg-brand-orange/10 text-brand-orange',
  enterprise: 'bg-emerald-light text-emerald',
  custom: 'bg-[color-mix(in_srgb,var(--bv-warning)_12%,white)] text-warning',
};

function priceLabel(plan: PlatformPlan): string {
  if (plan.priceMonthly === null) return 'Custom/month';
  return `${formatCurrency(plan.priceMonthly)}/month`;
}

export function PlansTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
  onEditPlan,
}: PlansTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load plans. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No plans yet"
          message="Subscription plans will appear here once the platform plans API is connected."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Plan Name</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Billing Cycle</th>
                  <th className="px-5 py-3 font-semibold">Businesses</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((plan) => {
                  const Icon = PLAN_ICONS[plan.iconKey];
                  return (
                    <tr
                      key={plan.id}
                      className="border-b border-border last:border-0 hover:bg-ivory/60"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex size-10 items-center justify-center rounded-full ${PLAN_ICON_WRAP[plan.iconKey]}`}
                          >
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-text">{plan.name}</p>
                            <p className="truncate text-xs text-text-secondary">
                              {plan.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-text">
                        {priceLabel(plan)}
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {plan.billingCycleLabel}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-text-secondary">
                        {formatNumber(plan.businessCount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          label={plan.status === 'active' ? 'Active' : 'Inactive'}
                          tone={plan.status === 'active' ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-brand-orange text-brand-orange hover:bg-brand-orange/5"
                            onClick={() => onEditPlan(plan)}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Edit
                          </Button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                            aria-label={`More actions for ${plan.name}`}
                            onClick={() =>
                              toast('More plan actions will be available soon.')
                            }
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {rows.map((plan) => {
              const Icon = PLAN_ICONS[plan.iconKey];
              return (
                <li key={plan.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`inline-flex size-10 items-center justify-center rounded-full ${PLAN_ICON_WRAP[plan.iconKey]}`}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-text">{plan.name}</p>
                        <p className="text-sm text-text-secondary">
                          {priceLabel(plan)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={plan.status === 'active' ? 'Active' : 'Inactive'}
                      tone={plan.status === 'active' ? 'success' : 'neutral'}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-12 text-xs text-text-secondary">
                    <span>{plan.billingCycleLabel}</span>
                    <span>{formatNumber(plan.businessCount)} businesses</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <PlansPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
