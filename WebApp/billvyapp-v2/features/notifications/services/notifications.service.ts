import { format, parseISO, startOfMonth, isValid } from 'date-fns';

import { api } from '@/services/api-client';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type { PaginatedResponse } from '@/features/dashboard/types/dashboard.types';
import {
  formatNotificationType,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
} from '../data/labels';
import type {
  CreateNotificationPayload,
  NotificationApiItem,
  NotificationListRow,
  NotificationsListParams,
  NotificationsPageData,
  NotificationStatus,
  NotificationSummarySlice,
} from '../types/notifications.types';

async function countNotifications(
  params: Record<string, string | number> = {},
): Promise<number> {
  const page = await api.get<PaginatedResponse<NotificationApiItem>>(
    '/notifications',
    { params: { page: 1, limit: 1, ...params } },
  );
  return page.meta.total;
}

function mapRow(row: NotificationApiItem): NotificationListRow {
  const title =
    row.subject?.trim() || formatNotificationType(row.notificationType);

  return {
    id: row.id,
    title,
    message: row.message,
    notificationType: row.notificationType,
    typeLabel: formatNotificationType(row.notificationType),
    channel: row.channel,
    channelLabel: NOTIFICATION_CHANNEL_LABELS[row.channel] ?? row.channel,
    audience: row.recipient,
    status: row.status,
    statusLabel: NOTIFICATION_STATUS_LABELS[row.status] ?? row.status,
    sentOn: row.sentAt ?? row.deliveredAt,
    createdAt: row.createdAt,
  };
}

function buildMetrics(counts: {
  total: number;
  sent: number;
  pending: number;
  failed: number;
}): DashboardMetric[] {
  return [
    {
      id: 'notifications-total',
      label: 'Total Notifications',
      value: String(counts.total),
      rawValue: counts.total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'notifications-sent',
      label: 'Sent Notifications',
      value: String(counts.sent),
      rawValue: counts.sent,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'notifications-pending',
      label: 'Pending Notifications',
      value: String(counts.pending),
      rawValue: counts.pending,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'notifications-failed',
      label: 'Failed Notifications',
      value: String(counts.failed),
      rawValue: counts.failed,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];
}

function buildSummary(counts: {
  sent: number;
  pending: number;
  failed: number;
  other: number;
}): { slices: NotificationSummarySlice[]; total: number } {
  const total = counts.sent + counts.pending + counts.failed + counts.other;
  const denom = Math.max(total, 1);

  return {
    total,
    slices: [
      {
        key: 'sent',
        label: 'Sent',
        count: counts.sent,
        percent: (counts.sent / denom) * 100,
        color: 'var(--bv-emerald)',
      },
      {
        key: 'pending',
        label: 'Pending',
        count: counts.pending,
        percent: (counts.pending / denom) * 100,
        color: 'var(--bv-champagne)',
      },
      {
        key: 'failed',
        label: 'Failed',
        count: counts.failed,
        percent: (counts.failed / denom) * 100,
        color: 'var(--bv-danger)',
      },
      {
        key: 'other',
        label: 'Others',
        count: counts.other,
        percent: (counts.other / denom) * 100,
        color: '#9ca3af',
      },
    ],
  };
}

function inDateRange(iso: string, dateFrom: string, dateTo: string): boolean {
  if (!dateFrom && !dateTo) return true;
  const date = parseISO(iso);
  if (!isValid(date)) return false;
  const day = format(date, 'yyyy-MM-dd');
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

function matchesSearch(row: NotificationListRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    row.title.toLowerCase().includes(q) ||
    row.message.toLowerCase().includes(q) ||
    row.audience.toLowerCase().includes(q) ||
    row.notificationType.toLowerCase().includes(q) ||
    row.typeLabel.toLowerCase().includes(q)
  );
}

/**
 * Loads Super Admin notifications from GET /notifications.
 * Search and date range are applied client-side until the API supports them.
 */
export async function fetchNotificationsPage(
  params: NotificationsListParams,
): Promise<NotificationsPageData> {
  const needsClientFilter =
    Boolean(params.search.trim()) ||
    Boolean(params.dateFrom) ||
    Boolean(params.dateTo);

  const listParams: Record<string, string | number> = {
    page: needsClientFilter ? 1 : params.page,
    limit: needsClientFilter ? 100 : params.limit,
  };
  if (params.status !== 'all') listParams.status = params.status;
  if (params.channel !== 'all') listParams.channel = params.channel;

  const [
    listPage,
    total,
    pendingCount,
    queuedCount,
    sentCount,
    deliveredCount,
    readCount,
    failedCount,
    cancelledCount,
  ] = await Promise.all([
    api.get<PaginatedResponse<NotificationApiItem>>('/notifications', {
      params: listParams,
    }),
    countNotifications(),
    countNotifications({ status: 'PENDING' satisfies NotificationStatus }),
    countNotifications({ status: 'QUEUED' }),
    countNotifications({ status: 'SENT' }),
    countNotifications({ status: 'DELIVERED' }),
    countNotifications({ status: 'READ' }),
    countNotifications({ status: 'FAILED' }),
    countNotifications({ status: 'CANCELLED' }),
  ]);

  const sent = sentCount + deliveredCount + readCount;
  const pending = pendingCount + queuedCount;
  const failed = failedCount;
  const other = cancelledCount;

  let rows = listPage.data.map(mapRow);
  let meta = listPage.meta;

  if (needsClientFilter) {
    rows = rows.filter(
      (row) =>
        matchesSearch(row, params.search) &&
        inDateRange(row.createdAt, params.dateFrom, params.dateTo),
    );
    const filteredTotal = rows.length;
    const totalPages =
      filteredTotal === 0 ? 0 : Math.ceil(filteredTotal / params.limit);
    const page = Math.min(params.page, Math.max(totalPages, 1));
    const start = (page - 1) * params.limit;
    rows = rows.slice(start, start + params.limit);
    meta = {
      page,
      limit: params.limit,
      total: filteredTotal,
      totalPages,
    };
  }

  const summary = buildSummary({ sent, pending, failed, other });

  return {
    metrics: buildMetrics({
      total,
      sent,
      pending,
      failed,
    }),
    rows,
    meta,
    summary: summary.slices,
    totalCount: summary.total,
  };
}

export async function createNotification(
  payload: CreateNotificationPayload,
): Promise<NotificationApiItem> {
  return api.post<NotificationApiItem>('/notifications', {
    channel: payload.channel,
    notificationType: payload.notificationType.trim(),
    recipient: payload.recipient.trim(),
    subject: payload.subject?.trim() || undefined,
    message: payload.message.trim(),
    scheduledAt: payload.scheduledAt || undefined,
  });
}

export function defaultNotificationsDateRange(): {
  dateFrom: string;
  dateTo: string;
} {
  const now = new Date();
  return {
    dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
  };
}
