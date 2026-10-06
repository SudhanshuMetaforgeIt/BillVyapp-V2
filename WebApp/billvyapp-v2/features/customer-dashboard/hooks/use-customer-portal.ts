'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Customer,
  CustomerAddress,
  CustomerAddressInput,
  CustomerUpdateInput,
} from '@/types/models';
import {
  bookAppointment,
  cancelMyAppointment,
  createAddress,
  deleteAddress,
  getMyBill,
  getMyCustomer,
  getMyLoyaltyBalance,
  getSalonForCustomer,
  listMembershipPlans,
  listMyAddresses,
  listMyAppointments,
  listMyBillDocuments,
  listMyBills,
  listMyLoyalty,
  listMyMemberships,
  listMyNotifications,
  listSalonCategories,
  listSalonServices,
  listSalonsForCustomer,
  updateAddress,
  updateMyCustomer,
} from '@/features/customer-portal/services/customer-portal.service';

/**
 * Customer-side data hooks. Every key is prefixed with the signed-in user's
 * scope by useScopedQuery, so nothing survives a sign-out or account switch.
 */

export function useMyCustomer() {
  return useScopedQuery(['customers', 'me'], getMyCustomer, { placeholderData: undefined, staleTime: QUERY_FRESHNESS.activity });
}

export function useUpdateMyCustomer(customerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<Customer, ApiError, CustomerUpdateInput>({
    mutationFn: (input) => updateMyCustomer(customerId as string, input),
    onSuccess: () => invalidateAfter(qc, 'customers'),
  });
}

export function useMyAddresses(customerId: string | undefined) {
  return useScopedQuery(['addresses', customerId], () => listMyAddresses(customerId as string), {
    enabled: Boolean(customerId),
    staleTime: QUERY_FRESHNESS.catalog,
  });
}

export function useSaveAddress(customerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<CustomerAddress, ApiError, { id?: string; input: CustomerAddressInput }>({
    mutationFn: ({ id, input }) =>
      id ? updateAddress(customerId as string, id, input) : createAddress(customerId as string, input),
    onSuccess: () => invalidateAfter(qc, 'addresses'),
  });
}

export function useDeleteAddress(customerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteAddress(customerId as string, id),
    onSuccess: () => invalidateAfter(qc, 'addresses'),
  });
}

export function useCustomerSalons(query: { page: number; limit: number; search?: string; city?: string }) {
  return useScopedQuery(['salons', 'customer', query], () => listSalonsForCustomer(query), { staleTime: QUERY_FRESHNESS.catalog });
}

export function useCustomerSalon(id: string | undefined) {
  return useScopedQuery(['salons', 'customer', 'detail', id], () => getSalonForCustomer(id as string), {
    enabled: Boolean(id),
    placeholderData: undefined,
    staleTime: QUERY_FRESHNESS.catalog,
  });
}

export function useSalonCategories(salonId: string | undefined) {
  return useScopedQuery(['services', 'categories', salonId], () => listSalonCategories(salonId), {
    enabled: Boolean(salonId),
    staleTime: QUERY_FRESHNESS.catalog,
  });
}

export function useSalonServiceList(query: {
  salonId?: string;
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}) {
  return useScopedQuery(['services', 'customer', query], () => listSalonServices(query), {
    enabled: Boolean(query.salonId),
    staleTime: QUERY_FRESHNESS.catalog,
  });
}

export function useMyAppointments(query: {
  page: number;
  limit: number;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useScopedQuery(['appointments', 'mine', query], () => listMyAppointments(query), { staleTime: QUERY_FRESHNESS.live, refetchOnWindowFocus: true });
}

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation<Appointment, ApiError, Omit<CreateAppointmentInput, 'customerId' | 'staffId'>>({
    mutationFn: bookAppointment,
    onSuccess: () => invalidateAfter(qc, 'appointments'),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation<Appointment, ApiError, string>({
    mutationFn: cancelMyAppointment,
    onSuccess: () => invalidateAfter(qc, 'appointments'),
  });
}

export function useMyBills(query: { page: number; limit: number }) {
  return useScopedQuery(['bills', 'mine', query], () => listMyBills(query), { staleTime: QUERY_FRESHNESS.billing, refetchOnWindowFocus: true });
}

export function useMyBill(id: string | null) {
  return useScopedQuery(['bills', 'mine', 'detail', id], () => getMyBill(id as string), {
    enabled: Boolean(id),
    placeholderData: undefined,
  });
}

export function useMyBillDocuments(billId: string | null) {
  return useScopedQuery(['bill-documents', billId], () => listMyBillDocuments(billId as string), {
    enabled: Boolean(billId),
    placeholderData: undefined,
  });
}

export function useMyLoyaltyBalance() {
  return useScopedQuery(['loyalty', 'balance'], getMyLoyaltyBalance, { placeholderData: undefined, staleTime: QUERY_FRESHNESS.activity });
}

export function useMyLoyalty(query: { page: number; limit: number }) {
  return useScopedQuery(['loyalty', 'mine', query], () => listMyLoyalty(query));
}

export function useMyMemberships(query: { page: number; limit: number }) {
  return useScopedQuery(['memberships', 'mine', query], () => listMyMemberships(query), { staleTime: QUERY_FRESHNESS.activity });
}

export function useMembershipPlans(query: { page: number; limit: number; salonId?: string }) {
  return useScopedQuery(['memberships', 'plans', query], () => listMembershipPlans(query), { staleTime: QUERY_FRESHNESS.catalog });
}

export function useMyNotifications(query: { page: number; limit: number }) {
  return useScopedQuery(['notifications', 'mine', query], () => listMyNotifications(query), { staleTime: QUERY_FRESHNESS.live, refetchOnWindowFocus: true });
}
