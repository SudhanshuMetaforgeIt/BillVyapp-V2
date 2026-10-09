import { api } from '@/services/api-client';
import { financialRequest, financialRequestKey } from '@/lib/financial-request';
import type {
  BillRecord,
  ValidatedBillCoupon,
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

export async function listServiceCategories(salonId?: string) {
  return api.get<PaginatedResponse<ServiceCategory>>('/service-categories', {
    params: { page: 1, limit: 100, isActive: true, salonId },
  });
}

export async function listServices(params?: {
  salonId?: string;
  search?: string;
  categoryId?: string;
}) {
  return api.get<PaginatedResponse<SalonService>>('/services', {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      salonId: params?.salonId || undefined,
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
  return api.post<BillRecord>('/bills', financialRequest(payload));
}

export async function completeBill(billId: string) {
  return api.patch<BillRecord>(`/bills/${billId}/status`, {
    status: 'COMPLETED',
  });
}

/** Counter payment the operator has already received; the backend records it as SUCCESS. */
export async function createPayment(payload: CreatePaymentPayload) {
  return api.post<PaymentRecord>('/payments', {
    ...financialRequest(payload),
    source: 'MANUAL',
    status: 'SUCCESS',
  });
}

export type SettleOutcome = 'paid' | 'completed' | 'draft' | 'price-changed';

/**
 * DRAFT -> COMPLETED -> payment of the backend-computed due amount.
 * Roles without bill-status permission stop at the draft.
 */
export async function settleWalkInBill(
  input: {
    idempotencyKey?: string;
    enrollmentPlanId?: string | null;
    enrollmentDetails?: CreateBillPayload["enrollmentDetails"];
    expectedTotal?: number;
    couponCode?: string | null;
    salonId: string;
    customerId: string;
    discount?: number;
    notes?: string | null;
    items: CreateBillPayload['items'];
    paymentMethod: CreatePaymentPayload['paymentMethod'];
  },
  { canComplete }: { canComplete: boolean },
): Promise<{
  bill: BillRecord;
  payment: PaymentRecord | null;
  outcome: SettleOutcome;
}> {
  const draft = await createBill({
    idempotencyKey: `${financialRequestKey(input)}:bill`,
    enrollmentPlanId: input.enrollmentPlanId, enrollmentDetails: input.enrollmentDetails,
    couponCode: input.couponCode?.trim().toUpperCase() || undefined,
    salonId: input.salonId,
    customerId: input.customerId,
    discount: input.discount && input.discount > 0 ? input.discount : undefined,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    items: input.items,
  });

  if ((input.couponCode || input.enrollmentPlanId) && input.expectedTotal !== undefined && Math.abs(Number(draft.total) - input.expectedTotal) > 0.005)
    return { bill: draft, payment: null, outcome: 'price-changed' };
  if (!canComplete) {
    return { bill: draft, payment: null, outcome: 'draft' };
  }

  const completed = await completeBill(draft.id);
  const dueAmount = Number(completed.dueAmount);
  if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
    return { bill: completed, payment: null, outcome: 'completed' };
  }

  // A concurrent visit may consume allowance between draft pricing and completion.
  // Require staff to confirm the new amount instead of recording a payment they did not receive.
  if ((input.couponCode || input.enrollmentPlanId) && Number.isFinite(Number(draft.total)) && Number(draft.total) !== Number(completed.total))
    return { bill: completed, payment: null, outcome: 'price-changed' };
  const payment = await createPayment({
    ...(completed.currency ? { currency: completed.currency } : {}),
    idempotencyKey: `${financialRequestKey(input)}:payment`,
    billId: completed.id,
    amount: dueAmount,
    paymentMethod: input.paymentMethod,
  });

  return { bill: completed, payment, outcome: 'paid' };
}

export function validateBillCoupon(input: {
  salonId: string;
  customerId: string;
  couponCode: string;
}) {
  return api.post<ValidatedBillCoupon>('/bills/validate-coupon', {
    ...input,
    couponCode: input.couponCode.trim().toUpperCase(),
  });
}
