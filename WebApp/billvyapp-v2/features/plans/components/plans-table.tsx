'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Gem,
  MoreVertical,
  Octagon,
  Pencil,
  Power,
  Send,
  TrendingUp,
} from 'lucide-react';
import { Menu } from '@base-ui/react/menu';

import { useUpdatePlanStatus } from '../hooks/use-plan-mutations';

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
  const statusMutation = useUpdatePlanStatus();

  const renderActions = (plan: PlatformPlan) => (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 border-brand-orange text-brand-orange hover:bg-brand-orange/5"
        aria-label={`Edit ${plan.name}`}
        onClick={() => onEditPlan(plan)}
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit
      </Button>
      <Menu.Root>
        <Menu.Trigger
          type="button"
          className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          aria-label={`More actions for ${plan.name}`}
          disabled={statusMutation.isPending}
        >
          <MoreVertical className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={6} className="z-[300]">
            <Menu.Popup
              aria-label={`Actions for ${plan.name}`}
              className="min-w-44 max-w-[calc(100vw-1rem)] rounded-xl border border-border bg-surface p-1 shadow-lg outline-none"
            >
              <Menu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text outline-none data-highlighted:bg-champagne-light"
                onClick={() => onEditPlan(plan)}
              >
                <Pencil className="size-3.5" aria-hidden />
                Edit plan
              </Menu.Item>
              <Menu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text outline-none data-highlighted:bg-champagne-light data-disabled:opacity-50"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({
                  id: plan.id,
                  isActive: plan.status !== 'active',
                })}
              >
                <Power className="size-3.5" aria-hidden />
                {plan.status === 'active' ? 'Deactivate plan' : 'Activate plan'}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );

  return (
    <div className="app-panel app-surface-card min-w-0" data-dash-animate="section">
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
          message="Add a subscription plan to get started."
        />
      ) : (
        <>
          <div className="app-plans-table relative min-w-0">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col />
                <col className="w-[12rem]" />
                <col className="w-[7rem]" />
                <col className="w-[7rem]" />
                <col className="w-[5rem]" />
                <col className="w-[7.5rem]" />
              </colgroup>
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
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${PLAN_ICON_WRAP[plan.iconKey]}`}
                          >
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-text">{plan.name}</p>
                            <p className="[overflow-wrap:anywhere] text-xs text-text-secondary">
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
                          className="whitespace-nowrap"
                          tone={plan.status === 'active' ? 'success' : 'neutral'}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        {renderActions(plan)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="app-plans-cards divide-y divide-border">
            {rows.map((plan) => {
              const Icon = PLAN_ICONS[plan.iconKey];
              return (
                <li key={plan.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-[1_1_12rem] items-center gap-3">
                      <span
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${PLAN_ICON_WRAP[plan.iconKey]}`}
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
                      className="whitespace-nowrap"
                          tone={plan.status === 'active' ? 'success' : 'neutral'}
                    />
                  </div>
                  <p className="text-sm text-text-secondary [overflow-wrap:anywhere]">
                    {plan.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                    <span>Billing cycle: {plan.billingCycleLabel}</span>
                    <span>{formatNumber(plan.businessCount)} businesses</span>
                  </div>
                  {renderActions(plan)}
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
