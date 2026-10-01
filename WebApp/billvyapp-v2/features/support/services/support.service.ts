import { api } from '@/services/api-client';
import { businessMonthToDate } from '@/lib/business-calendar';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  SupportCategorySlice,
  SupportListParams,
  SupportPageData,
  SupportStatusSlice,
  SupportTicketRow,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/support.types';

type SupportTicketApiItem = {
  id: string;
  displayId: string;
  subject: string;
  description: string;
  preview: string;
  category: TicketCategory;
  categoryLabel: string;
  priority: TicketPriority;
  priorityLabel: string;
  status: TicketStatus;
  statusLabel: string;
  customerName: string;
  businessName: string;
  franchiseId: string | null;
  salonId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

type SupportTicketsListResponse = {
  data: SupportTicketApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    byStatus: Array<{ status: TicketStatus; count: number }>;
    byCategory: Array<{ category: TicketCategory; count: number }>;
  };
};

export type CreateSupportTicketPayload = {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
};

export type UpdateSupportTicketStatusPayload = {
  id: string;
  status: TicketStatus;
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'var(--bv-emerald)',
  in_progress: 'var(--bv-champagne)',
  resolved: '#35507a',
  closed: '#9ca3af',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: 'Billing',
  payments: 'Payments',
  account: 'Account',
  feature_request: 'Feature Request',
  subscription: 'Subscription',
  reports: 'Reports',
};

function buildMetrics(summary: SupportTicketsListResponse['summary']): DashboardMetric[] {
  const count = (status: TicketStatus) =>
    summary.byStatus.find((row) => row.status === status)?.count ?? 0;

  return [
    {
      id: 'support-total-tickets',
      label: 'Total Tickets',
      value: String(summary.total),
      rawValue: summary.total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-open-tickets',
      label: 'Open Tickets',
      value: String(count('open')),
      rawValue: count('open'),
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-in-progress',
      label: 'In Progress',
      value: String(count('in_progress')),
      rawValue: count('in_progress'),
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-resolved',
      label: 'Resolved Tickets',
      value: String(count('resolved')),
      rawValue: count('resolved'),
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-closed',
      label: 'Closed Tickets',
      value: String(count('closed')),
      rawValue: count('closed'),
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];
}

function mapRow(row: SupportTicketApiItem): SupportTicketRow {
  return {
    id: row.id,
    displayId: row.displayId,
    subject: row.subject,
    description: row.description,
    preview: row.preview,
    customerName: row.customerName,
    businessName: row.businessName,
    category: row.category,
    categoryLabel: row.categoryLabel || CATEGORY_LABELS[row.category],
    priority: row.priority,
    priorityLabel: row.priorityLabel,
    status: row.status,
    statusLabel: row.statusLabel || STATUS_LABELS[row.status],
    createdAt: row.createdAt,
  };
}

function buildStatusSummary(
  byStatus: SupportTicketsListResponse['summary']['byStatus'],
  total: number,
): SupportStatusSlice[] {
  return (['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(
    (key) => {
      const count = byStatus.find((row) => row.status === key)?.count ?? 0;
      return {
        key,
        label: STATUS_LABELS[key],
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
        color: STATUS_COLORS[key],
      };
    },
  );
}

function buildCategorySummary(
  byCategory: SupportTicketsListResponse['summary']['byCategory'],
): SupportCategorySlice[] {
  return byCategory
    .filter((row) => row.count > 0)
    .map((row) => ({
      key: row.category,
      label: CATEGORY_LABELS[row.category],
      count: row.count,
    }));
}

export async function fetchSupportPage(
  params: SupportListParams,
): Promise<SupportPageData> {
  const queryParams: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search.trim()) queryParams.search = params.search.trim();
  if (params.status !== 'all') queryParams.status = params.status;
  if (params.priority !== 'all') queryParams.priority = params.priority;
  if (params.category !== 'all') queryParams.category = params.category;
  if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
  if (params.dateTo) queryParams.dateTo = params.dateTo;

  const page = await api.get<SupportTicketsListResponse>('/support-tickets', {
    params: queryParams,
  });

  return {
    metrics: buildMetrics(page.summary),
    rows: page.data.map(mapRow),
    meta: page.meta,
    statusSummary: buildStatusSummary(page.summary.byStatus, page.summary.total),
    categorySummary: buildCategorySummary(page.summary.byCategory),
    totalCount: page.summary.total,
  };
}

export async function createSupportTicket(
  payload: CreateSupportTicketPayload,
): Promise<SupportTicketRow> {
  const row = await api.post<SupportTicketApiItem>('/support-tickets', payload);
  return mapRow(row);
}

export async function updateSupportTicketStatus(
  payload: UpdateSupportTicketStatusPayload,
): Promise<SupportTicketRow> {
  const row = await api.patch<SupportTicketApiItem>(
    `/support-tickets/${payload.id}/status`,
    { status: payload.status },
  );
  return mapRow(row);
}

export function defaultSupportDateRange(): { dateFrom: string; dateTo: string } {
  return businessMonthToDate();
}
