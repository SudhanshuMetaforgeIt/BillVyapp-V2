import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/features/dashboard/types/dashboard.types';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';

export type { PaginatedResponse, PaginationMeta, DashboardMetric };

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'WALLET'
  | 'OTHER';

export type PaymentStatusFilter = 'all' | PaymentStatus;
export type PaymentMethodFilter = 'all' | PaymentMethod;

export type PaymentApiItem = {
  id: string;
  billId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  paymentDate: string;
  status: PaymentStatus;
  notes: string | null;
  salonId?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentListRow = {
  id: string;
  displayId: string;
  businessName: string;
  businessInitials: string;
  customerName: string;
  customerInitials: string;
  amount: number;
  method: PaymentMethod;
  methodLabel: string;
  paymentDate: string;
  status: PaymentStatus;
  statusLabel: string;
  franchiseId: string | null;
};

export type PaymentsListParams = {
  page: number;
  limit: number;
  search: string;
  franchiseId: string;
  method: PaymentMethodFilter;
  status: PaymentStatusFilter;
  dateFrom: string;
  dateTo: string;
};

export type FranchiseOption = {
  id: string;
  name: string;
};

export type PaymentSummarySlice = {
  key: 'SUCCESS' | 'PENDING' | 'FAILED';
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type PaymentsPageData = {
  metrics: DashboardMetric[];
  rows: PaymentListRow[];
  meta: PaginationMeta;
  summary: PaymentSummarySlice[];
  totalCount: number;
  franchises: FranchiseOption[];
};
