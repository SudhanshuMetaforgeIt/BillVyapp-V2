'use client';

import { Eye, MoreVertical } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';
import type {
  PaginationMeta,
  SupportTicketRow,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/support.types';
import { SupportPagination } from './support-pagination';

type SupportTableProps = {
  rows: SupportTicketRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

function categoryTone(
  category: TicketCategory,
): 'info' | 'success' | 'accent' | 'warning' | 'neutral' {
  if (category === 'billing') return 'info';
  if (category === 'payments') return 'success';
  if (category === 'account') return 'accent';
  if (category === 'feature_request') return 'warning';
  if (category === 'subscription') return 'neutral';
  return 'neutral';
}

function priorityTone(
  priority: TicketPriority,
): 'danger' | 'warning' | 'success' {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'success';
}

function statusTone(
  status: TicketStatus,
): 'success' | 'info' | 'accent' | 'neutral' {
  if (status === 'open') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'resolved') return 'accent';
  return 'neutral';
}

export function SupportTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: SupportTableProps) {
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
          message="We could not load support tickets. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No support tickets yet"
          message="Tickets will appear here once the support tickets API is connected."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ticket ID</th>
                  <th className="px-5 py-3 font-semibold">Subject</th>
                  <th className="px-5 py-3 font-semibold">Customer / Business</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Priority</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Created On</th>
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
                    <td className="px-5 py-3.5 font-semibold text-brand-orange">
                      {row.displayId}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">
                          {row.subject}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {row.preview}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {row.customerName}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {row.businessName}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.categoryLabel}
                        tone={categoryTone(row.category)}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.priorityLabel}
                        tone={priorityTone(row.priority)}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.statusLabel}
                        tone={statusTone(row.status)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                          aria-label={`View ${row.displayId}`}
                        >
                          <Eye className="size-4" />
                        </button>
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
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border xl:hidden">
            {rows.map((row) => (
              <li key={row.id} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-orange">
                      {row.displayId}
                    </p>
                    <p className="font-semibold text-text">{row.subject}</p>
                    <p className="text-xs text-text-secondary">
                      {row.customerName} / {row.businessName}
                    </p>
                  </div>
                  <StatusBadge
                    label={row.statusLabel}
                    tone={statusTone(row.status)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    label={row.categoryLabel}
                    tone={categoryTone(row.category)}
                  />
                  <StatusBadge
                    label={row.priorityLabel}
                    tone={priorityTone(row.priority)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <SupportPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
