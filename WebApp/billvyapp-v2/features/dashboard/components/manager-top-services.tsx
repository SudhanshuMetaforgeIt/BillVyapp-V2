'use client';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { ManagerTopServiceRow } from '../services/dashboard.service';

type ManagerTopServicesProps = {
  rows: ManagerTopServiceRow[];
  isLoading?: boolean;
};

export function ManagerTopServices({
  rows,
  isLoading,
}: ManagerTopServicesProps) {
  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <DashboardSectionCard
      title="Top Services"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="space-y-3 pt-4"
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <SectionEmptyState message="No service sales in this period." />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-text">{row.name}</span>
                <span className="shrink-0 text-text-secondary">
                  {formatNumber(row.quantity)} · {formatCurrency(row.revenue)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-champagne"
                  style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
