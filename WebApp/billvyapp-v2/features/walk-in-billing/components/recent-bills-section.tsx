'use client';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatFullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useRecentBills } from '../hooks/use-recent-bills';
import type { WalkInCustomer } from '../types/walk-in-billing.types';

type RecentBillsSectionProps = {
  customer: WalkInCustomer | null;
};

function methodTone(method: string | null | undefined): string {
  switch (method) {
    case 'UPI':
      return 'bg-charcoal text-white';
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

function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Partial';
    case 'UNPAID':
      return 'Unpaid';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

export function RecentBillsSection({ customer }: RecentBillsSectionProps) {
  const query = useRecentBills(customer?.id ?? null);

  return (
    <section className="app-surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <h2 className="text-base font-semibold text-text">
          {customer
            ? `Recent Bills for ${formatFullName(customer)}`
            : 'Recent Bills'}
        </h2>
      </div>

      {!customer ? (
        <SectionEmptyState message="Select a customer to see their recent bills." />
      ) : query.isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <SectionErrorState
          message="Could not load recent bills."
          onRetry={() => void query.refetch()}
        />
      ) : (query.data?.data.length ?? 0) === 0 ? (
        <SectionEmptyState message="No bills for this customer yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs tracking-wide text-text-secondary uppercase">
                <th className="px-5 py-3 font-semibold">Bill No.</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Payment Method</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.data.map((bill) => {
                const method =
                  bill.payments?.find((p) => p.status === 'SUCCESS')
                    ?.paymentMethod ?? null;
                return (
                  <tr
                    key={bill.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-text">
                      {bill.billNumber}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {formatDate(bill.billDate)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-text">
                      {formatCurrency(bill.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          methodTone(method),
                        )}
                      >
                        {method?.replaceAll('_', ' ') ?? '—'}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'px-5 py-3 font-medium',
                        bill.paymentStatus === 'PAID'
                          ? 'text-emerald'
                          : 'text-text-secondary',
                      )}
                    >
                      {paymentStatusLabel(bill.paymentStatus)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
