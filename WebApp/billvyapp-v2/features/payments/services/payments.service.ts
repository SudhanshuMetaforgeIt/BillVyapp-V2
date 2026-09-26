import { api } from '@/services/api-client';
import type { Paginated, Payment, PaymentMethod, PaymentStatus } from '@/types/models';

export type PaymentQuery = {
  page: number;
  limit: number;
  billId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
};

function clean<T extends Record<string, unknown>>(query: T) {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== '' && v != null));
}

export function listPayments(query: PaymentQuery) {
  return api.get<Paginated<Payment>>('/payments', { params: clean(query) });
}

export async function countPayments(query: Omit<PaymentQuery, 'page' | 'limit'>): Promise<number> {
  const page = await api.get<Paginated<Payment>>('/payments', {
    params: clean({ ...query, page: 1, limit: 1 }),
  });
  return page.meta.total;
}

export function updatePaymentStatus(id: string, status: PaymentStatus) {
  return api.patch<Payment>(`/payments/${id}/status`, { status });
}

/** Mirror of PAYMENT_STATUS_TRANSITIONS; the backend enforces it. */
export const PAYMENT_NEXT_STATUSES: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'],
  SUCCESS: ['FAILED', 'CANCELLED', 'REFUNDED'],
  FAILED: [],
  REFUNDED: [],
  CANCELLED: [],
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  WALLET: 'Wallet',
  OTHER: 'Other',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  SUCCESS: 'Successful',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};
