'use client';
import dynamic from 'next/dynamic';

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CircleAlert,
  Eye,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { useState } from 'react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';
import type {
  NotificationChannel,
  NotificationListRow,
  NotificationStatus,
  PaginationMeta,
} from '../types/notifications.types';
import { NotificationsPagination } from './notifications-pagination';
const LazyViewNotificationDialog = dynamic(() => import('./view-notification-dialog').then((module) => module.ViewNotificationDialog), { loading: () => <p role="status">Opening dialog…</p> });
function ViewNotificationDialog(props: import('react').ComponentProps<typeof import('./view-notification-dialog').ViewNotificationDialog>) {
  return props.notification ? <LazyViewNotificationDialog {...props} /> : null;
}

type NotificationsTableProps = {
  rows: NotificationListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

const CHANNEL_ICONS: Record<NotificationChannel, LucideIcon> = {
  EMAIL: Mail,
  SMS: Smartphone,
  WHATSAPP: MessageSquare,
};

function statusTone(
  status: NotificationStatus,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
    return 'success';
  }
  if (status === 'PENDING' || status === 'QUEUED') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'neutral';
}

function channelTone(
  channel: NotificationChannel,
): 'accent' | 'info' | 'success' {
  if (channel === 'EMAIL') return 'info';
  if (channel === 'SMS') return 'accent';
  return 'success';
}

export function NotificationsTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: NotificationsTableProps) {
  const [viewing, setViewing] = useState<NotificationListRow | null>(null);

  return (
    <>
      <div
        className="app-surface-card overflow-hidden"
        data-dash-animate="section"
      >
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
            message="Try adjusting your search or filters, or send a new notification."
          />
        ) : (
          <>
            <div tabIndex={0} role="region" aria-label="Scrollable table" className="app-table-scroll hidden min-w-0 lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="w-[38%] px-3 py-3 font-semibold xl:px-4">
                      Notification
                    </th>
                    <th className="w-[14%] px-3 py-3 font-semibold xl:px-4">
                      Type
                    </th>
                    <th className="w-[20%] px-3 py-3 font-semibold xl:px-4">
                      Audience
                    </th>
                    <th className="w-[12%] px-3 py-3 font-semibold xl:px-4">
                      Status
                    </th>
                    <th className="w-[12%] px-3 py-3 font-semibold xl:px-4">
                      Sent On
                    </th>
                    <th className="w-[4%] px-3 py-3 font-semibold xl:px-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const ChannelIcon = CHANNEL_ICONS[row.channel] ?? Bell;
                    const isFailed = row.status === 'FAILED';
                    const Icon = isFailed ? CircleAlert : ChannelIcon;
                    const sentLabel = row.sentOn
                      ? formatDateTime(row.sentOn)
                      : formatDateTime(row.createdAt);
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0 hover:bg-ivory/60"
                      >
                        <td className="px-3 py-3.5 xl:px-4">
                          <button
                            type="button"
                            className="flex w-full min-w-0 items-center gap-2.5 text-left"
                            onClick={() => setViewing(row)}
                          >
                            <span
                              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                                isFailed
                                  ? 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger'
                                  : 'bg-champagne-light text-champagne'
                              }`}
                            >
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p
                                className="truncate font-semibold text-text"
                                title={row.title}
                              >
                                {row.title}
                              </p>
                              <p
                                className="truncate text-xs text-text-secondary"
                                title={row.message}
                              >
                                {row.message}
                              </p>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3.5 xl:px-4">
                          <StatusBadge
                            label={row.channelLabel}
                            tone={channelTone(row.channel)}
                            className="whitespace-nowrap"
                          />
                        </td>
                        <td className="px-3 py-3.5 text-text-secondary xl:px-4">
                          <span className="block truncate" title={row.audience}>
                            {row.audience}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 xl:px-4">
                          <StatusBadge
                            label={row.statusLabel}
                            tone={statusTone(row.status)}
                            className="whitespace-nowrap"
                          />
                        </td>
                        <td className="px-3 py-3.5 text-text-secondary xl:px-4">
                          <span className="block truncate" title={sentLabel}>
                            {sentLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 xl:px-4">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                              aria-label={`View ${row.title}`}
                              onClick={() => setViewing(row)}
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border lg:hidden">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full space-y-2 px-4 py-4 text-left hover:bg-ivory/50"
                    onClick={() => setViewing(row)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-text">{row.title}</p>
                        <p className="truncate text-xs text-text-secondary">
                          {row.message}
                        </p>
                      </div>
                      <StatusBadge
                        label={row.statusLabel}
                        tone={statusTone(row.status)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                      <StatusBadge
                        label={row.channelLabel}
                        tone={channelTone(row.channel)}
                      />
                      <span>{row.audience}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <NotificationsPagination meta={meta} onPageChange={onPageChange} />
          </>
        )}
      </div>

      <ViewNotificationDialog
        notification={viewing}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
