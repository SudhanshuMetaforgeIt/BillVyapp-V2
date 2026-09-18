'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { MANAGER_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-manager-dashboard';
import { settleWalkInBill } from '../services/walk-in-billing.service';
import type { WalkInPaymentMethod } from '../types/walk-in-billing.types';
import { RECENT_BILLS_QUERY_KEY } from './use-recent-bills';

export type SettleWalkInInput = {
  salonId: string;
  customerId: string;
  discount?: number;
  notes?: string | null;
  items: Array<{ itemType: 'SERVICE'; serviceId: string; quantity: number }>;
  paymentMethod: WalkInPaymentMethod;
};

export function useSettleWalkInBill(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SettleWalkInInput) => settleWalkInBill(input),
    onSuccess: (result) => {
      toast.success(`Bill ${result.bill.billNumber} paid`);
      void queryClient.invalidateQueries({ queryKey: RECENT_BILLS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: MANAGER_DASHBOARD_QUERY_KEY,
      });
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
