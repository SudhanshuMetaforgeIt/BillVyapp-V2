import { api } from '@/services/api-client';
import type {
  BillRecord,
  CreateBillPayload,
  CreateCustomerPayload,
  CreatePaymentPayload,
  PaginatedResponse,
  PaymentRecord,
  SalonService,
  ServiceCategory,
  WalkInCustomer,
} from '../types/walk-in-billing.types';

export async function searchCustomers(search: string, page = 1, limit = 10) {
  return api.get<PaginatedResponse<WalkInCustomer>>('/customers', {
    params: {
      page,
      limit,
      search: search.trim() || undefined,
      isActive: true,
    },
  });
}

export async function createCustomer(payload: CreateCustomerPayload) {
  return api.post<WalkInCustomer>('/customers', payload);
}

export async function listServiceCategories() {
  return api.get<PaginatedResponse<ServiceCategory>>('/service-categories', {
    params: { page: 1, limit: 100, isActive: true },
  });
}

export async function listServices(params?: {
  search?: string;
  categoryId?: string;
}) {
  return api.get<PaginatedResponse<SalonService>>('/services', {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      search: params?.search?.trim() || undefined,
      categoryId: params?.categoryId || undefined,
    },
  });
}

export async function listCustomerBills(customerId: string, limit = 5) {
  return api.get<PaginatedResponse<BillRecord>>('/bills', {
    params: {
      page: 1,
      limit,
      customerId,
    },
  });
}

export async function createBill(payload: CreateBillPayload) {
  return api.post<BillRecord>('/bills', payload);
}

export async function completeBill(billId: string) {
  return api.patch<BillRecord>(`/bills/${billId}/status`, {
    status: 'COMPLETED',
  });
}

export async function createPayment(payload: CreatePaymentPayload) {
  return api.post<PaymentRecord>('/payments', {
    ...payload,
    status: 'SUCCESS',
  });
}

export async function settleWalkInBill(input: {
  salonId: string;
  customerId: string;
  discount?: number;
  notes?: string | null;
  items: CreateBillPayload['items'];
  paymentMethod: CreatePaymentPayload['paymentMethod'];
}) {
  const draft = await createBill({
    salonId: input.salonId,
    customerId: input.customerId,
    discount: input.discount && input.discount > 0 ? input.discount : undefined,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    items: input.items,
  });

  const completed = await completeBill(draft.id);
  const dueAmount = Number(completed.dueAmount);
  if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
    return { bill: completed, payment: null };
  }

  const payment = await createPayment({
    billId: completed.id,
    amount: dueAmount,
    paymentMethod: input.paymentMethod,
  });

  return { bill: completed, payment };
}
