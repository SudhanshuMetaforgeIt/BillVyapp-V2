import { api } from '@/services/api-client';
import { financialRequest } from '@/lib/financial-request';
import type {
  Bill,
  BillPaymentStatus,
  BillStatus,
  Paginated,
  Payment,
  PaymentMethod,
} from '@/types/models';

export type BillQuery = {
  page: number;
  limit: number;
  salonId?: string;
  customerId?: string;
  status?: BillStatus;
  paymentStatus?: BillPaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

function clean(query: BillQuery) {
  return {
    ...query,
    salonId: query.salonId || undefined,
    customerId: query.customerId || undefined,
    status: query.status || undefined,
    paymentStatus: query.paymentStatus || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    search: query.search?.trim() || undefined,
  };
}

export function listBills(query: BillQuery) {
  return api.get<Paginated<Bill>>('/bills', { params: clean(query) });
}

/** Exact count for a filter from the backend's pagination meta (one row fetched). */
export async function countBills(query: Omit<BillQuery, 'page' | 'limit'>): Promise<number> {
  const page = await api.get<Paginated<Bill>>('/bills', {
    params: clean({ ...query, page: 1, limit: 1 }),
  });
  return page.meta.total;
}

export function getBill(id: string) {
  return api.get<Bill>(`/bills/${id}`);
}

export function changeBillStatus(id: string, status: BillStatus) {
  return api.patch<Bill>(`/bills/${id}/status`, { status });
}

/** Mirror of BILL_STATUS_TRANSITIONS; the backend enforces it. */
export const BILL_NEXT_STATUSES: Record<BillStatus, BillStatus[]> = {
  DRAFT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['REFUNDED', 'CANCELLED'],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * Records money the operator has already collected at the counter. The
 * backend validates the amount against the bill's due amount.
 */
export function recordCounterPayment(input: {
  idempotencyKey?: string;
  currency?: string;
  billId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  notes?: string | null;
}) {
  return api.post<Payment>('/payments', { ...financialRequest(input), source: 'MANUAL', status: 'SUCCESS' });
}
