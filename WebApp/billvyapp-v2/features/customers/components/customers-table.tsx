'use client';

import { Eye, MoreVertical } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  CustomerListRow,
  PaginationMeta,
} from '../types/customers.types';
import { CustomersPagination } from './customers-pagination';

type CustomersTableProps = {
  rows: CustomerListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

function membershipClass(tone: CustomerListRow['membershipTone']): string {
  if (tone === 'gold') return 'text-[#b8860b]';
  if (tone === 'silver') return 'text-slate-500';
  if (tone === 'platinum') return 'text-[#6b5b95]';
  if (tone === 'expired') return 'text-danger';
  return 'text-text-secondary';
}

export function CustomersTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: CustomersTableProps) {
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
          message="We could not load customers. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No customers found"
          message="Try adjusting filters, or add a new customer."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer ID</th>
                  <th className="px-4 py-3 font-semibold">Customer Details</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Membership</th>
                  <th className="px-4 py-3 font-semibold">Total Visits</th>
                  <th className="px-4 py-3 font-semibold">Total Spend</th>
                  <th className="px-4 py-3 font-semibold">Last Visit</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-0 hover:bg-ivory/50"
                  >
                    <td className="px-4 py-3.5 font-medium text-text">
                      {row.customerCode}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-champagne-light text-[11px] font-bold text-charcoal">
                          {row.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text">
                            {row.fullName}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {row.genderLabel}
                            {row.ageLabel !== '—' ? `, ${row.ageLabel}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-text">{row.phoneMasked}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p
                        className={cn(
                          'font-semibold',
                          membershipClass(row.membershipTone),
                        )}
                      >
                        {row.membershipLabel}
                      </p>
                      {row.membershipExpiry ? (
                        <p
                          className={cn(
                            'text-xs',
                            row.membershipTone === 'expired'
                              ? 'text-danger'
                              : 'text-text-secondary',
                          )}
                        >
                          {row.membershipExpiry}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.totalVisitsLabel}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.totalSpendLabel}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.lastVisitLabel}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          row.isActive
                            ? 'bg-emerald-light text-emerald'
                            : 'bg-muted text-charcoal-soft',
                        )}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                          aria-label={`View ${row.fullName}`}
                          disabled
                          title="View coming soon"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                          aria-label={`More actions for ${row.fullName}`}
                          disabled
                          title="Actions coming soon"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CustomersPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
