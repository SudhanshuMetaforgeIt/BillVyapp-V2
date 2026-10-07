'use client';

import { formatCurrency } from '@/lib/format';

import { PrefetchLink } from '@/components/ui/prefetch-link';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { StatusBadge } from '@/components/ui/status-badge';
import { ROUTES } from '@/constants/routes';
import type {
  AdminRecentBill,
  AdminBillStatus,
} from '../types/admin-dashboard.types';

function billStatusTone(
  status: AdminBillStatus,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'paid') return 'success';
  if (status === 'partial') return 'info';
  if (status === 'unpaid' || status === 'draft') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
}

function billStatusLabel(status: AdminBillStatus): string {
  const labels: Record<AdminBillStatus, string> = {
    paid: 'Paid',
    partial: 'Partially paid',
    unpaid: 'Unpaid',
    draft: 'Draft',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return labels[status];
}

type AdminRecentBillsProps = {
  bills: AdminRecentBill[];
};

export function AdminRecentBills({ bills }: AdminRecentBillsProps) {
  return (
    <DashboardSectionCard
      title="Recent Bills"
      data-dash-animate="section"
      action={
        <PrefetchLink
          href={ROUTES.dashboard.admin.bills}
          prefetchStrategy="intent"
          className="text-sm font-semibold text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          View all
        </PrefetchLink>
      }
      bodyClassName="p-0"
    >
      {bills.length === 0 ? (
        <SectionEmptyState message="No bills have been raised yet." />
      ) : (
        <>
          {/* Desktop table */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Scrollable table"
            className="app-table-scroll hidden overflow-x-auto sm:block"
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Bill No.</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="hover:bg-ivory/60 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-text">
                      {bill.billNo}
                    </td>
                    <td className="px-5 py-3 text-text">{bill.customer}</td>
                    <td className="px-5 py-3 font-semibold text-text">
                      {formatCurrency(bill.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={billStatusLabel(bill.status)}
                        tone={billStatusTone(bill.status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-border sm:hidden">
            {bills.map((bill) => (
              <li
                key={bill.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-text">
                    {bill.billNo}
                  </p>
                  <p className="text-sm text-text">{bill.customer}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text">
                    {formatCurrency(bill.amount)}
                  </span>
                  <StatusBadge
                    label={billStatusLabel(bill.status)}
                    tone={billStatusTone(bill.status)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardSectionCard>
  );
}
