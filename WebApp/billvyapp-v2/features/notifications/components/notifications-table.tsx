'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CircleAlert,
  Eye,
  Mail,
  MessageSquare,
  MoreVertical,
  Smartphone,
} from 'lucide-react';

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
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Notification</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Audience</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Sent On</th>
                  <th className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ChannelIcon = CHANNEL_ICONS[row.channel] ?? Bell;
                  const isFailed = row.status === 'FAILED';
                  const Icon = isFailed ? CircleAlert : ChannelIcon;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-ivory/60"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex size-10 items-center justify-center rounded-full ${
                              isFailed
                                ? 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger'
                                : 'bg-champagne-light text-champagne'
                            }`}
                          >
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
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          label={row.channelLabel}
                          tone={channelTone(row.channel)}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        <span className="truncate">{row.audience}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          label={row.statusLabel}
                          tone={statusTone(row.status)}
                        />
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {row.sentOn
                          ? formatDateTime(row.sentOn)
                          : formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                            aria-label={`View ${row.title}`}
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                            aria-label={`More actions for ${row.title}`}
                          >
                            <MoreVertical className="size-4" />
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
              <li key={row.id} className="space-y-2 px-4 py-4">
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
              </li>
            ))}
          </ul>

          <NotificationsPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
