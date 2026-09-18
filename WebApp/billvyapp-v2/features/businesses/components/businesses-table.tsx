'use client';

import { Eye, MoreVertical, UserRound } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format';
import type { BusinessListRow } from '../types/businesses.types';
import { BusinessesPagination } from './businesses-pagination';
import type { PaginationMeta } from '../types/businesses.types';

type BusinessesTableProps = {
  rows: BusinessListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

function planTone(
  tone: BusinessListRow['planTone'],
): 'info' | 'accent' | 'neutral' {
  if (tone === 'professional') return 'accent';
  if (tone === 'basic') return 'info';
  if (tone === 'enterprise') return 'neutral';
  return 'neutral';
}

function statusTone(
  status: BusinessListRow['status'],
): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

export function BusinessesTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: BusinessesTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load businesses. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No businesses found"
          message="Try adjusting your search or filters, or add a new business."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Business</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Joined On</th>
                  <th className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-ivory/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                          {row.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text">
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {row.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-2 text-text-secondary">
                        <UserRound className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{row.ownerLabel}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.planLabel}
                        tone={planTone(row.planTone)}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.statusLabel}
                        tone={statusTone(row.status)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {formatDate(row.joinedOn)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                          aria-label={`View ${row.name}`}
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                          aria-label={`More actions for ${row.name}`}
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

          <ul className="divide-y divide-border md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                      {row.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.ownerLabel}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    label={row.statusLabel}
                    tone={statusTone(row.status)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  <StatusBadge
                    label={row.planLabel}
                    tone={planTone(row.planTone)}
                  />
                  <span className="text-xs text-text-secondary">
                    Joined {formatDate(row.joinedOn)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <BusinessesPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
