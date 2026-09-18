'use client';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ManagerBillRow } from '../services/dashboard.service';

type ManagerRecentBillsProps = {
  rows: ManagerBillRow[];
  isLoading?: boolean;
};

function methodTone(method: string | null): string {
  switch (method) {
    case 'UPI':
      return 'bg-emerald-light text-emerald';
    case 'CASH':
      return 'bg-champagne-light text-champagne';
    case 'CARD':
      return 'bg-[#e8eef8] text-[#35507a]';
    case 'WALLET':
      return 'bg-brand-orange/10 text-brand-orange';
    default:
      return 'bg-muted text-charcoal-soft';
  }
}

export function ManagerRecentBills({
  rows,
  isLoading,
}: ManagerRecentBillsProps) {
  return (
    <DashboardSectionCard
      title="Recent Bills"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <SectionEmptyState message="No recent bills to show." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs tracking-wide text-text-secondary uppercase">
                <th className="px-4 py-3 font-semibold">Bill No.</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-text">
                    {row.billNumber}
                  </td>
                  <td className="px-4 py-3 text-text">{row.customerLabel}</td>
                  <td className="px-4 py-3 tabular-nums text-text">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        methodTone(row.paymentMethod),
                      )}
                    >
                      {row.paymentMethodLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {row.timeLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSectionCard>
  );
}
