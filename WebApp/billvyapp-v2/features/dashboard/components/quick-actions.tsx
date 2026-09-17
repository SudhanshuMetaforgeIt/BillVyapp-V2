'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import type { QuickActionConfig } from '../data/placeholders';

type QuickActionsProps = {
  actions: QuickActionConfig[];
  isLoading?: boolean;
};

export function QuickActions({ actions, isLoading }: QuickActionsProps) {
  return (
    <DashboardSectionCard
      title="Quick Actions"
      data-dash-animate="section"
      bodyClassName="space-y-2 p-3"
    >
      {isLoading ? (
        <div className="space-y-2 p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <SectionEmptyState message="No quick actions configured." />
      ) : (
        <ul className="space-y-1">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text transition-colors hover:bg-champagne-light/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight
                    className="size-4 text-text-secondary transition group-hover:text-charcoal"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
