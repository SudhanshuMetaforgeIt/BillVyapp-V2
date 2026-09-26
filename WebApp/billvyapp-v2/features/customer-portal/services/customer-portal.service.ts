import { api } from '@/services/api-client';
import type {
  AppNotification,
  Appointment,
  AppointmentStatus,
  Bill,
  BillDocument,
  CreateAppointmentInput,
  Customer,
  CustomerAddress,
  CustomerAddressInput,
  CustomerUpdateInput,
  LoyaltyBalance,
  LoyaltyTransaction,
  Membership,
  MembershipPlan,
  Paginated,
  Payment,
  Salon,
  SalonService,
  ServiceCategory,
} from '@/types/models';

/**
 * Everything the customer web app reads or writes. The backend scopes each
 * call to the signed-in customer (ScopeService.requireOwnCustomerId), so no
 * customer id from the client is ever trusted as authorization.
 */

/** GET /customers is scoped to the caller's own row for CUSTOMER. */
export async function getMyCustomer(): Promise<Customer> {
  const page = await api.get<Paginated<Customer>>('/customers', {
    params: { page: 1, limit: 1 },
  });
  const me = page.data[0];
  if (!me) {
    throw { status: 404, message: 'Your customer profile was not found.' };
  }
  return me;
}

export function updateMyCustomer(id: string, input: CustomerUpdateInput) {
  return api.patch<Customer>(`/customers/${id}`, input);
}

export function listMyAddresses(customerId: string) {
  return api.get<Paginated<CustomerAddress>>(`/customers/${customerId}/addresses`, {
    params: { page: 1, limit: 50 },
  });
}

export function createAddress(customerId: string, input: CustomerAddressInput) {
  return api.post<CustomerAddress>(`/customers/${customerId}/addresses`, input);
}

export function updateAddress(
  customerId: string,
  id: string,
  input: Partial<CustomerAddressInput>,
) {
  return api.patch<CustomerAddress>(`/customers/${customerId}/addresses/${id}`, input);
}

export function deleteAddress(customerId: string, id: string) {
  return api.delete<void>(`/customers/${customerId}/addresses/${id}`);
}

// ----------------------------------------------------------- discovery

/** Backend forces isActive=true for CUSTOMER callers. */
export function listSalonsForCustomer(query: {
  page: number;
  limit: number;
  search?: string;
  city?: string;
}) {
  return api.get<Paginated<Salon>>('/salons', {
    params: {
      page: query.page,
      limit: query.limit,
      search: query.search?.trim() || undefined,
      city: query.city?.trim() || undefined,
    },
  });
}

export function getSalonForCustomer(id: string) {
  return api.get<Salon>(`/salons/${id}`);
}

export function listSalonServices(query: {
  salonId?: string;
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  return api.get<Paginated<SalonService>>('/services', {
    params: {
      page: query.page,
      limit: query.limit,
      isActive: true,
      salonId: query.salonId || undefined,
      categoryId: query.categoryId || undefined,
      search: query.search?.trim() || undefined,
    },
  });
}

export function listSalonCategories(salonId?: string) {
  return api.get<Paginated<ServiceCategory>>('/service-categories', {
    params: { page: 1, limit: 100, isActive: true, salonId: salonId || undefined },
  });
}

// ---------------------------------------------------------- appointments

export function listMyAppointments(query: {
  page: number;
  limit: number;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
}) {
  return api.get<Paginated<Appointment>>('/appointments', {
    params: {
      ...query,
      status: query.status || undefined,
    },
  });
}

/** customerId is omitted: the backend books for the signed-in customer. */
export function bookAppointment(input: Omit<CreateAppointmentInput, 'customerId' | 'staffId'>) {
  return api.post<Appointment>('/appointments', input);
}

export function cancelMyAppointment(id: string) {
  return api.patch<Appointment>(`/appointments/${id}/status`, { status: 'CANCELLED' });
}

// ------------------------------------------------------- billing/loyalty

export function listMyBills(query: { page: number; limit: number }) {
  return api.get<Paginated<Bill>>('/bills', { params: query });
}

export function getMyBill(id: string) {
  return api.get<Bill>(`/bills/${id}`);
}

export function listMyBillDocuments(billId: string) {
  return api.get<Paginated<BillDocument>>(`/bills/${billId}/documents`, {
    params: { page: 1, limit: 20 },
  });
}

export function listMyPayments(query: { page: number; limit: number; billId?: string }) {
  return api.get<Paginated<Payment>>('/payments', {
    params: { ...query, billId: query.billId || undefined },
  });
}

export function listMyMemberships(query: { page: number; limit: number }) {
  return api.get<Paginated<Membership>>('/memberships', { params: query });
}

/** Backend returns only active plans for CUSTOMER. */
export function listMembershipPlans(query: { page: number; limit: number; salonId?: string }) {
  return api.get<Paginated<MembershipPlan>>('/membership-plans', {
    params: { ...query, salonId: query.salonId || undefined },
  });
}

export function getMyLoyaltyBalance() {
  return api.get<LoyaltyBalance>('/loyalty/balance');
}

export function listMyLoyalty(query: { page: number; limit: number }) {
  return api.get<Paginated<LoyaltyTransaction>>('/loyalty', { params: query });
}

export function listMyNotifications(query: { page: number; limit: number }) {
  return api.get<Paginated<AppNotification>>('/notifications', { params: query });
}
