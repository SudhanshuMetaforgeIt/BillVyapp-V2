'use client';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import type { ManagerPendingRow } from '../services/dashboard.service';

type ManagerPendingCollectionProps = {
  rows: ManagerPendingRow[];
  isLoading?: boolean;
};

export function ManagerPendingCollection({
  rows,
  isLoading,
}: ManagerPendingCollectionProps) {
  return (
    <DashboardSectionCard
      title="Pending Collection"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <SectionEmptyState message="No pending collections right now." />
      ) : (
        <ul className="divide-y divide-border/70">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {row.customerLabel}
                </p>
                <p className="text-xs text-text-secondary">
                  {row.billNumber} · {row.daysPending}{' '}
                  {row.daysPending === 1 ? 'day' : 'days'} pending
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-danger">
                {formatCurrency(row.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
