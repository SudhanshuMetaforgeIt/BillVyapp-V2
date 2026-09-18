'use client';

import {
  ChevronRight,
  CalendarClock,
  FilePlus2,
  Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { RevenueOverview } from '@/features/dashboard/components/revenue-overview';
import type {
  ReportTypeSlice,
  RevenuePoint,
} from '../types/reports.types';
import { ReportsTypeDonut } from './reports-type-donut';

type ReportsSidebarProps = {
  revenueSeries: RevenuePoint[];
  reportsByType: ReportTypeSlice[];
  reportsTotal: number;
  isLoading?: boolean;
};

const QUICK_ACTIONS = [
  {
    id: 'custom',
    label: 'Create Custom Report',
    description: 'Build a report from scratch',
    icon: FilePlus2,
  },
  {
    id: 'schedule',
    label: 'Schedule Reports',
    description: 'Automate recurring exports',
    icon: CalendarClock,
  },
  {
    id: 'settings',
    label: 'Report Settings',
    description: 'Defaults and delivery options',
    icon: Settings2,
  },
] as const;

export function ReportsSidebar({
  revenueSeries,
  reportsByType,
  reportsTotal,
  isLoading,
}: ReportsSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <RevenueOverview series={revenueSeries} isLoading={isLoading} />

      <DashboardSectionCard
        title="Reports by Type"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : reportsByType.length === 0 ? (
          <SectionEmptyState
            title="No report history"
            message="Type breakdown will appear after reports are generated."
            className="py-6"
          />
        ) : (
          <ReportsTypeDonut total={reportsTotal} slices={reportsByType} />
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
                      `${action.label} will be available once the reports API is connected.`,
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
    </div>
  );
}
