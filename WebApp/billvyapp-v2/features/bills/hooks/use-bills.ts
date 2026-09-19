'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBill,
  fetchAdminBills,
  updateBillStatus,
} from '../services/bills.service';
import type {
  BillStatus,
  BillsFilterState,
  CreateBillPayload,
} from '../types/bills.types';

export function useAdminBills(filters: Partial<BillsFilterState> = {}) {
  return useQuery({
    queryKey: ['admin-bills', filters],
    queryFn: () => fetchAdminBills(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBillPayload) => createBill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}

export function useUpdateBillStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billId,
      status,
    }: {
      billId: string;
      status: BillStatus;
    }) => updateBillStatus(billId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bills'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}
