'use client';

import {
  Bell,
  CalendarDays,
  CheckCheck,
  CreditCard,
  MoreVertical,
  Package,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type {
  ManagerNotificationCategory,
  ManagerNotificationRow,
  ManagerNotificationTab,
  PaginationMeta,
} from '../types/notifications.types';
import { ManagerNotificationsTabs } from './manager-notifications-tabs';
import { NotificationsPagination } from './notifications-pagination';

type ManagerNotificationsTableProps = {
  rows: ManagerNotificationRow[];
  meta: PaginationMeta;
  tab: ManagerNotificationTab;
  onTabChange: (value: ManagerNotificationTab) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
  onMarkAllRead: () => void;
  markAllPending?: boolean;
  canMarkAll?: boolean;
};

const CATEGORY_ICON: Record<ManagerNotificationCategory, LucideIcon> = {
  Appointment: CalendarDays,
  Billing: Receipt,
  Payment: CreditCard,
  Inventory: Package,
  Membership: Sparkles,
  Customer: Users,
  System: Bell,
  Other: Bell,
};

function categoryClass(category: ManagerNotificationCategory): string {
  if (category === 'Appointment') return 'bg-[#e8eefc] text-[#3b6bc7]';
  if (category === 'Payment') return 'bg-emerald-light text-emerald';
  if (category === 'Inventory') {
    return 'bg-[color-mix(in_srgb,var(--bv-warning)_14%,white)] text-warning';
  }
  if (category === 'Membership') return 'bg-[#eee8f8] text-[#5b4a7a]';
  if (category === 'Billing') return 'bg-[#fde8f1] text-[#b54a7a]';
  if (category === 'Customer') return 'bg-[#e8f4fc] text-[#2f7aa8]';
  return 'bg-muted text-charcoal-soft';
}

export function ManagerNotificationsTable({
  rows,
  meta,
  tab,
  onTabChange,
  isLoading,
  isError,
  onRetry,
  onPageChange,
  onMarkAllRead,
  markAllPending,
  canMarkAll,
}: ManagerNotificationsTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      <div className="flex flex-col gap-3 border-b border-border px-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <ManagerNotificationsTabs value={tab} onChange={onTabChange} />
        <div className="px-2 pb-2 sm:pb-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={!canMarkAll || markAllPending}
            onClick={onMarkAllRead}
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load notifications. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No notifications found"
          message="You are all caught up for this filter."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold tracking-wide text-text-secondary uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Notification</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const Icon = CATEGORY_ICON[row.category] ?? Bell;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/60 last:border-0 hover:bg-ivory/50"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-champagne-light text-charcoal">
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-text">
                              {row.title}
                            </p>
                            <p className="truncate text-xs text-text-secondary">
                              {row.message}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            categoryClass(row.category),
                          )}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary">
                        {row.dateTimeLabel}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 text-sm text-text">
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              row.isUnread ? 'bg-[#3b6bc7]' : 'bg-charcoal-soft/40',
                            )}
                          />
                          {row.readStatusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
                          disabled
                          title="Actions coming soon"
                          aria-label={`More actions for ${row.title}`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <NotificationsPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
