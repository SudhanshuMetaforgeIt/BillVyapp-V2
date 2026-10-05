'use client';

import { SelectInput } from '@/components/data/form-fields';
import { Eye } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatDateTime } from '@/lib/format';
import { useUpdateSupportTicketStatus } from '../hooks/use-support-mutations';
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
  canUpdateStatus?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  onViewTicket?: (ticket: SupportTicketRow) => void;
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
  canUpdateStatus,
  emptyMessage = 'Tickets raised by admins and managers will appear here.',
  onRetry,
  onPageChange,
  onCreate,
  onViewTicket,
}: SupportTableProps) {
  const statusMutation = useUpdateSupportTicketStatus();

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
          message={emptyMessage}
          action={
            onCreate ? (
              <Button
                type="button"
                className="mt-3 bg-brand-orange text-white hover:bg-brand-orange-deep"
                onClick={onCreate}
              >
                Raise Ticket
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div tabIndex={0} role="region" aria-label="Scrollable table" className="app-table-scroll hidden xl:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="w-[10%] px-4 py-3 font-semibold">Ticket ID</th>
                  <th className="w-[22%] px-4 py-3 font-semibold">Subject</th>
                  <th className="w-[16%] px-4 py-3 font-semibold">
                    Raised By / Business
                  </th>
                  <th className="w-[12%] px-4 py-3 font-semibold">Category</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Priority</th>
                  <th className="w-[14%] px-4 py-3 font-semibold">Status</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Created On</th>
                  <th className="w-[6%] px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-ivory/60"
                    onClick={() => onViewTicket?.(row)}
                  >
                    <td className="px-4 py-3.5 font-semibold text-brand-orange">
                      <span className="block truncate" title={row.displayId}>
                        {row.displayId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="min-w-0">
                        <p
                          className="truncate font-semibold text-text"
                          title={row.subject}
                        >
                          {row.subject}
                        </p>
                        <p
                          className="truncate text-xs text-text-secondary"
                          title={row.preview}
                        >
                          {row.preview}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="min-w-0">
                        <p
                          className="truncate font-medium text-text"
                          title={row.customerName}
                        >
                          {row.customerName}
                        </p>
                        <p
                          className="truncate text-xs text-text-secondary"
                          title={row.businessName}
                        >
                          {row.businessName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label={row.categoryLabel}
                        tone={categoryTone(row.category)}
                        className="max-w-full truncate whitespace-nowrap"
                        title={row.categoryLabel}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label={row.priorityLabel}
                        tone={priorityTone(row.priority)}
                        className="whitespace-nowrap"
                      />
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {canUpdateStatus ? (
                        <SelectInput
                          aria-label={`Status for ${row.displayId}`}
                          value={row.status}
                          disabled={statusMutation.isPending}
                          className="h-9 w-full min-w-0 max-w-[9rem] text-xs"
                          onChange={(e) =>
                            statusMutation.mutate({
                              id: row.id,
                              status: e.target.value as TicketStatus,
                            })
                          }
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </SelectInput>
                      ) : (
                        <StatusBadge
                          label={row.statusLabel}
                          tone={statusTone(row.status)}
                          className="whitespace-nowrap"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      <span
                        className="block whitespace-nowrap"
                        title={formatDateTime(row.createdAt)}
                      >
                        {formatDate(row.createdAt)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-brand-orange hover:bg-brand-orange/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                          aria-label={`View ${row.displayId}`}
                          onClick={() => onViewTicket?.(row)}
                        >
                          <Eye className="size-4" />
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
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full space-y-2 px-4 py-4 text-left hover:bg-ivory/60"
                  onClick={() => onViewTicket?.(row)}
                >
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
                </button>
              </li>
            ))}
          </ul>

          <SupportPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
