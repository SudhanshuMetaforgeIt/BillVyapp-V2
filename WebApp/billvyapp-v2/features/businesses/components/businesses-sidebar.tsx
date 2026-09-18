'use client';

import Link from 'next/link';
import { Headset } from 'lucide-react';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { formatNumber } from '@/lib/format';
import type {
  BusinessSummarySlice,
  PlanMixItem,
} from '../types/businesses.types';
import { BusinessesStatusDonut } from './businesses-status-donut';

type BusinessesSidebarProps = {
  total: number;
  summary: BusinessSummarySlice[];
  planMix: PlanMixItem[];
  isLoading?: boolean;
};

export function BusinessesSidebar({
  total,
  summary,
  planMix,
  isLoading,
}: BusinessesSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Business Summary"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <BusinessesStatusDonut total={total} slices={summary} />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Top Plans"
        data-dash-animate="section"
        bodyClassName="space-y-3 pt-4"
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : planMix.length === 0 ? (
          <SectionEmptyState
            title="No plan data"
            message="Plan distribution will appear when businesses are linked to subscriptions."
            className="py-6"
          />
        ) : (
          <ul className="space-y-3">
            {planMix.map((plan) => (
              <li key={plan.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-text">{plan.label}</span>
                  <span className="tabular-nums text-text-secondary">
                    <span className="font-semibold text-text">
                      {formatNumber(plan.count)}
                    </span>{' '}
                    ({plan.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-champagne"
                    style={{ width: `${Math.min(plan.percent, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Quick Help"
        data-dash-animate="section"
        bodyClassName="space-y-4 pt-4"
      >
        <p className="text-sm text-text-secondary">
          Need help managing businesses?
        </p>
        <Link
          href={ROUTES.dashboard.superAdmin.support}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-orange bg-transparent text-sm font-medium text-brand-orange transition-colors hover:bg-brand-orange/5 hover:text-brand-orange-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <Headset className="size-4" aria-hidden />
          Contact Support
        </Link>
      </DashboardSectionCard>
    </div>
  );
}
