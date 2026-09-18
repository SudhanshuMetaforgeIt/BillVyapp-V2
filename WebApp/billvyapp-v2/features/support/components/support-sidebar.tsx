'use client';

import {
  ChevronRight,
  Download,
  FilePlus2,
  List,
  Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  SupportCategorySlice,
  SupportStatusSlice,
} from '../types/support.types';
import { SupportStatusDonut } from './support-status-donut';

type SupportSidebarProps = {
  totalCount: number;
  statusSummary: SupportStatusSlice[];
  isLoading?: boolean;
};

const QUICK_ACTIONS = [
  {
    id: 'create',
    label: 'Create New Ticket',
    description: 'Open a support request',
    icon: FilePlus2,
  },
  {
    id: 'view',
    label: 'View All Tickets',
    description: 'Browse the full queue',
    icon: List,
  },
  {
    id: 'export',
    label: 'Export Tickets',
    description: 'Download ticket records',
    icon: Download,
  },
  {
    id: 'settings',
    label: 'Support Settings',
    description: 'Configure support options',
    icon: Settings2,
  },
] as const;

export function SupportSidebar({
  totalCount,
  statusSummary,
  isLoading,
}: SupportSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Support Overview"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : totalCount === 0 ? (
          <SectionEmptyState
            title="No tickets yet"
            message="Status overview will appear once tickets are available."
            className="py-6"
          />
        ) : (
          <SupportStatusDonut total={totalCount} slices={statusSummary} />
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
                  onClick={() =>
                    toast(
                      `${action.label} will be available once the support tickets API is connected.`,
                    )
                  }
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
        <p className="text-sm font-semibold text-text">Need more help?</p>
        <p className="mt-1 text-sm text-text-secondary">
          Our support team is available 24/7. We&apos;re here to help you
          anytime.
        </p>
        <a
          href="mailto:support@billvyapp.com"
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-brand-orange bg-transparent text-sm font-medium text-brand-orange transition-colors hover:bg-brand-orange/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          Contact Support Team
        </a>
      </section>
    </div>
  );
}

type SupportCategoriesBarProps = {
  categories: SupportCategorySlice[];
  isLoading?: boolean;
};

export function SupportCategoriesBar({
  categories,
  isLoading,
}: SupportCategoriesBarProps) {
  return (
    <DashboardSectionCard
      title="Top Support Categories"
      data-dash-animate="section"
      bodyClassName="pt-4"
    >
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : categories.length === 0 ? (
        <SectionEmptyState
          title="No category data"
          message="Category breakdown will appear when tickets are available."
          className="py-4"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {categories.map((category) => (
            <li
              key={category.key}
              className="rounded-xl border border-border/80 bg-ivory/50 px-4 py-3 text-center"
            >
              <p className="text-sm font-medium text-text">{category.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-text">
                {category.count}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
