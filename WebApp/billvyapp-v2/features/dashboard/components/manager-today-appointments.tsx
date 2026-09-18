'use client';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ManagerAppointmentRow } from '../services/dashboard.service';

type ManagerTodayAppointmentsProps = {
  rows: ManagerAppointmentRow[];
  isLoading?: boolean;
};

const STATUS_CLASS: Record<ManagerAppointmentRow['statusTone'], string> = {
  success: 'bg-emerald-light text-emerald',
  warning: 'bg-[color-mix(in_srgb,var(--bv-warning)_14%,white)] text-warning',
  accent: 'bg-champagne-light text-champagne',
  danger: 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger',
  neutral: 'bg-muted text-charcoal-soft',
};

export function ManagerTodayAppointments({
  rows,
  isLoading,
}: ManagerTodayAppointmentsProps) {
  return (
    <DashboardSectionCard
      title="Today's Appointments"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <SectionEmptyState message="No appointments scheduled for today." />
      ) : (
        <ul className="divide-y divide-border/70">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="w-12 shrink-0 font-semibold tabular-nums text-text">
                {row.timeLabel}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">
                  {row.customerLabel}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {row.serviceLabel}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase',
                  STATUS_CLASS[row.statusTone],
                )}
              >
                {row.status.replaceAll('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
