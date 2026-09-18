'use client';

import {
  Banknote,
  CreditCard,
  MoreVertical,
  Smartphone,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDate } from '@/lib/format';
import type {
  PaginationMeta,
  PaymentListRow,
  PaymentMethod,
  PaymentStatus,
} from '../types/payments.types';
import { PaymentsPagination } from './payments-pagination';

type PaymentsTableProps = {
  rows: PaymentListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

const METHOD_ICONS: Partial<Record<PaymentMethod, LucideIcon>> = {
  CASH: Banknote,
  UPI: Smartphone,
  CARD: CreditCard,
  BANK_TRANSFER: Banknote,
  WALLET: Wallet,
  OTHER: CreditCard,
};

function statusTone(
  status: PaymentStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'neutral';
}

export function PaymentsTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: PaymentsTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load payments. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No payments found"
          message="Try adjusting your search, filters, or date range."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Payment ID</th>
                  <th className="px-5 py-3 font-semibold">Business</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const MethodIcon = METHOD_ICONS[row.method] ?? CreditCard;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-ivory/60"
                    >
                      <td className="px-5 py-3.5 font-semibold text-text">
                        {row.displayId}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                            {row.businessInitials}
                          </span>
                          <span className="truncate font-medium text-text">
                            {row.businessName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-charcoal-soft">
                            {row.customerInitials}
                          </span>
                          <span className="truncate text-text-secondary">
                            {row.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold tabular-nums text-text">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-text-secondary">
                          <MethodIcon className="size-3.5 shrink-0" aria-hidden />
                          {row.methodLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {formatDate(row.paymentDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          label={row.statusLabel}
                          tone={statusTone(row.status)}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-brand-orange text-brand-orange hover:bg-brand-orange/5"
                          >
                            View
                          </Button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                            aria-label={`More actions for ${row.displayId}`}
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {rows.map((row) => (
              <li key={row.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{row.displayId}</p>
                    <p className="truncate text-sm text-text-secondary">
                      {row.businessName} · {row.customerName}
                    </p>
                  </div>
                  <StatusBadge
                    label={row.statusLabel}
                    tone={statusTone(row.status)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-text">
                    {formatCurrency(row.amount)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {row.methodLabel} · {formatDate(row.paymentDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <PaymentsPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
