'use client';

import { format, parseISO, isValid } from 'date-fns';
import { Eye, MoreVertical, Scissors } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  AppointmentListRow,
  AppointmentStatus,
  PaginationMeta,
} from '../types/appointments.types';
import { AppointmentsPagination } from './appointments-pagination';
import { AppointmentsTabs } from './appointments-tabs';
import type { AppointmentStatusTab } from '../types/appointments.types';

type AppointmentsTableProps = {
  rows: AppointmentListRow[];
  meta: PaginationMeta;
  statusTab: AppointmentStatusTab;
  onStatusTabChange: (value: AppointmentStatusTab) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

function formatTime(value: string): string {
  const raw = value.length === 5 ? `${value}:00` : value;
  const date = parseISO(`1970-01-01T${raw}`);
  return isValid(date) ? format(date, 'h:mm a') : value.slice(0, 5);
}

function formatApptDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'MMM d, yyyy') : value;
}

function statusClass(status: AppointmentStatus): string {
  if (status === 'COMPLETED') return 'bg-emerald-light text-emerald';
  if (status === 'CANCELLED') {
    return 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger';
  }
  if (status === 'NO_SHOW') return 'bg-muted text-charcoal-soft';
  if (status === 'IN_PROGRESS') {
    return 'bg-[color-mix(in_srgb,var(--bv-warning)_14%,white)] text-warning';
  }
  return 'bg-[#eee8f8] text-[#5b4a7a]';
}

export function AppointmentsTable({
  rows,
  meta,
  statusTab,
  onStatusTabChange,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: AppointmentsTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      <AppointmentsTabs value={statusTab} onChange={onStatusTabChange} />

      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load appointments. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No appointments found"
          message="Try adjusting filters, or book a new appointment."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Appointment ID</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Staff</th>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
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
                      {row.appointmentNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-champagne-light text-[11px] font-bold text-charcoal">
                          {row.customerInitials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text">
                            {row.customerName}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {row.customerPhone
                              ? formatPhone(row.customerPhone)
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-charcoal-soft">
                          <Scissors className="size-3.5" aria-hidden />
                        </span>
                        <span className="font-medium text-text">
                          {row.serviceLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-charcoal-soft">
                          {row.staffInitials}
                        </span>
                        <span className="text-text">{row.staffName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-text">
                        {formatApptDate(row.appointmentDate)}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatTime(row.startTime)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.durationMinutes} min
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          statusClass(row.status),
                        )}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {row.sourceLabel}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                          aria-label={`View ${row.appointmentNumber}`}
                          disabled
                          title="View coming soon"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                          aria-label={`More actions for ${row.appointmentNumber}`}
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

          <AppointmentsPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
