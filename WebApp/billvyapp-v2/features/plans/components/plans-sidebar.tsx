'use client';

import {
  ChevronRight,
  GitCompareArrows,
  History,
  ListChecks,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { DashboardSectionCard, SectionEmptyState } from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import type { PlanPriceSlice } from '../types/plans.types';
import { PlansPriceDonut } from './plans-price-donut';

type PlansSidebarProps = {
  averagePrice: number;
  priceOverview: PlanPriceSlice[];
  isLoading?: boolean;
  onAddPlan: () => void;
};

const QUICK_ACTIONS = [
  {
    id: 'add',
    label: 'Add New Plan',
    description: 'Create a subscription tier',
    icon: Plus,
    action: 'add' as const,
  },
  {
    id: 'features',
    label: 'Plan Features',
    description: 'Manage feature matrices',
    icon: ListChecks,
    action: 'toast' as const,
  },
  {
    id: 'history',
    label: 'Pricing History',
    description: 'View past price changes',
    icon: History,
    action: 'toast' as const,
  },
  {
    id: 'compare',
    label: 'Compare Plans',
    description: 'Side-by-side plan review',
    icon: GitCompareArrows,
    action: 'toast' as const,
  },
];

export function PlansSidebar({
  averagePrice,
  priceOverview,
  isLoading,
  onAddPlan,
}: PlansSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Price Overview"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-xl" />
        ) : priceOverview.length === 0 ? (
          <SectionEmptyState
            title="No price data"
            message="Price overview will appear when subscription plans are available."
            className="py-6"
          />
        ) : (
          <PlansPriceDonut
            averagePrice={averagePrice}
            slices={priceOverview}
          />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Quick Actions"
        data-dash-animate="section"
        bodyClassName="space-y-1 p-3"
      >
        <ul className="space-y-1">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (action.action === 'add') {
                      onAddPlan();
                      return;
                    }
                    toast(`${action.label} will be available once plans API is live.`);
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{action.label}</span>
                    <span className="block text-xs font-normal text-text-secondary">
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 text-text-secondary transition group-hover:text-charcoal"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </DashboardSectionCard>

      <section
        className="overflow-hidden rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-5"
        data-dash-animate="section"
      >
        <p className="text-sm font-semibold text-text">Need help with plans?</p>
        <p className="mt-1 text-sm text-text-secondary">
          Learn how to create and manage plans.
        </p>
        <Link
          href={ROUTES.dashboard.superAdmin.support}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-brand-orange bg-transparent text-sm font-medium text-brand-orange transition-colors hover:bg-brand-orange/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          View Guide
        </Link>
      </section>
    </div>
  );
}
