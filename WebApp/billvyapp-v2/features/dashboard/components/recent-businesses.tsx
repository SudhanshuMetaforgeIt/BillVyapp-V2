'use client';

import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import type { RecentBusinessRow } from '../services/dashboard.service';

type RecentBusinessesProps = {
  rows: RecentBusinessRow[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

function planTone(
  tone: RecentBusinessRow['planTone'],
): 'info' | 'accent' | 'neutral' {
  if (tone === 'professional') return 'accent';
  if (tone === 'basic') return 'info';
  return 'neutral';
}

function statusTone(
  status: RecentBusinessRow['status'],
): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

export function RecentBusinesses({
  rows,
  isLoading,
  isError,
  onRetry,
}: RecentBusinessesProps) {
  return (
    <DashboardSectionCard
      title="Recent Businesses"
      data-dash-animate="section"
      action={
        <Link
          href={ROUTES.dashboard.superAdmin.businesses}
          className="text-sm font-semibold text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          View All Businesses →
        </Link>
      }
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load recent businesses."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState message="No businesses have been registered yet." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Business</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
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
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
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
                    <td className="px-5 py-3 text-text-secondary">
                      {row.ownerLabel}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={row.planLabel}
                        tone={planTone(row.planTone)}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={row.statusLabel}
                        tone={statusTone(row.status)}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                        aria-label={`Actions for ${row.name}`}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-border md:hidden">
            {rows.map((row) => (
              <li key={row.id} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
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
                <div className="flex items-center gap-2 pl-12">
                  <StatusBadge
                    label={row.planLabel}
                    tone={planTone(row.planTone)}
                  />
                  <span className="text-xs text-text-secondary">{row.code}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardSectionCard>
  );
}
