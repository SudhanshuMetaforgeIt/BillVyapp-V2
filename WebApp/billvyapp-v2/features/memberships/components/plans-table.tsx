'use client';

import { MoreVertical, Pencil, Tags } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PaginationMeta, PlanListRow } from '../types/memberships.types';
import { MembershipsPagination } from './memberships-pagination';

type PlansTableProps = {
  rows: PlanListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

export function PlansTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: PlansTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <SectionErrorState
        message="We could not load membership plans. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <SectionEmptyState
        title="No plans found"
        message="Create a membership plan to start enrolling members."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Members</th>
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
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                      <Tags className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-medium text-text">
                  {row.priceLabel}
                </td>
                <td className="px-4 py-3.5 text-text-secondary">
                  {row.durationLabel}
                </td>
                <td className="px-4 py-3.5 text-text">{row.memberCount}</td>
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
                      aria-label={`Edit ${row.name}`}
                      disabled
                      title="Edit coming soon"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                      aria-label={`More actions for ${row.name}`}
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
      <MembershipsPagination
        meta={meta}
        noun="plans"
        onPageChange={onPageChange}
      />
    </>
  );
}
