'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/capabilities';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
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
  const user = useCurrentUser();
  const canComplete = can(user, 'bills.status');

  return useMutation({
    mutationFn: (input: SettleWalkInInput) => settleWalkInBill(input, { canComplete }),
    onSuccess: (result) => {
      const number = result.bill.billNumber;
      if (result.outcome === 'draft') {
        toast.success(`Draft bill ${number} saved for manager approval`);
      } else if (result.outcome === 'completed') {
        toast.success(`Bill ${number} completed — nothing due`);
      } else {
        toast.success(`Bill ${number} paid`);
      }
      void queryClient.invalidateQueries({ queryKey: RECENT_BILLS_QUERY_KEY });
      void invalidateAfter(queryClient, 'bills');
      onSuccess?.();
    },
    onError: (error: ApiError) => {
      // A failure after the draft step leaves a real bill; refetch so it shows up.
      toast.error(error.message);
      void invalidateAfter(queryClient, 'bills');
      void queryClient.invalidateQueries({ queryKey: RECENT_BILLS_QUERY_KEY });
    },
  });
}
