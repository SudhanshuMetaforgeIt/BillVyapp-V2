import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type { PaginationMeta } from '@/features/dashboard/types/dashboard.types';

export type { DashboardMetric, PaginationMeta };

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'high' | 'medium' | 'low';
export type TicketCategory =
  | 'billing'
  | 'payments'
  | 'account'
  | 'feature_request'
  | 'subscription'
  | 'reports';

export type TicketStatusFilter = 'all' | TicketStatus;
export type TicketPriorityFilter = 'all' | TicketPriority;
export type TicketCategoryFilter = 'all' | TicketCategory;

export type SupportTicketRow = {
  id: string;
  displayId: string;
  subject: string;
  preview: string;
  customerName: string;
  businessName: string;
  category: TicketCategory;
  categoryLabel: string;
  priority: TicketPriority;
  priorityLabel: string;
  status: TicketStatus;
  statusLabel: string;
  createdAt: string;
};

export type SupportStatusSlice = {
  key: TicketStatus;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type SupportCategorySlice = {
  key: TicketCategory;
  label: string;
  count: number;
};

export type SupportListParams = {
  page: number;
  limit: number;
  search: string;
  status: TicketStatusFilter;
  priority: TicketPriorityFilter;
  category: TicketCategoryFilter;
  dateFrom: string;
  dateTo: string;
};

export type SupportPageData = {
  metrics: DashboardMetric[];
  rows: SupportTicketRow[];
  meta: PaginationMeta;
  statusSummary: SupportStatusSlice[];
  categorySummary: SupportCategorySlice[];
  totalCount: number;
};
