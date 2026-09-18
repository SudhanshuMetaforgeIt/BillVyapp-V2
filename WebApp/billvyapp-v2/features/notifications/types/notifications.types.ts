import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/features/dashboard/types/dashboard.types';

export type { DashboardMetric, PaginationMeta, PaginatedResponse };

export type NotificationChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';

export type NotificationStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';

export type NotificationStatusFilter = 'all' | NotificationStatus;
export type NotificationChannelFilter = 'all' | NotificationChannel;

export type NotificationApiItem = {
  id: string;
  salonId: string | null;
  userId: string | null;
  customerId: string | null;
  channel: NotificationChannel;
  notificationType: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: NotificationStatus;
  provider: string | null;
  providerReference: string | null;
  errorMessage: string | null;
  retryCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListRow = {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  typeLabel: string;
  channel: NotificationChannel;
  channelLabel: string;
  audience: string;
  status: NotificationStatus;
  statusLabel: string;
  sentOn: string | null;
  createdAt: string;
};

export type NotificationSummarySlice = {
  key: 'sent' | 'pending' | 'failed' | 'other';
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type NotificationsListParams = {
  page: number;
  limit: number;
  search: string;
  status: NotificationStatusFilter;
  channel: NotificationChannelFilter;
  dateFrom: string;
  dateTo: string;
};

export type NotificationsPageData = {
  metrics: DashboardMetric[];
  rows: NotificationListRow[];
  meta: PaginationMeta;
  summary: NotificationSummarySlice[];
  totalCount: number;
};

export type CreateNotificationPayload = {
  channel: NotificationChannel;
  notificationType: string;
  recipient: string;
  subject?: string;
  message: string;
  scheduledAt?: string;
};
