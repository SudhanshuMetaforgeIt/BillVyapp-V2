'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import toast from 'react-hot-toast';

import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/capabilities';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import { settleWalkInBill } from '../services/walk-in-billing.service';
import type { WalkInPaymentMethod } from '../types/walk-in-billing.types';
import { RECENT_BILLS_QUERY_KEY } from './use-recent-bills';

export type SettleWalkInInput = {
  enrollmentPlanId?: string | null;
  enrollmentDetails?: import("../types/walk-in-billing.types").EnrollmentDetails;
  expectedTotal?: number;
  couponCode?: string | null;
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
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  return useMutation({
    mutationFn: (input: SettleWalkInInput) => {
      const fingerprint = JSON.stringify(input);
      if (attempt.current?.fingerprint !== fingerprint)
        attempt.current = { fingerprint, key: crypto.randomUUID() };
      return settleWalkInBill({ ...input, idempotencyKey: attempt.current.key }, { canComplete });
    },
    onSuccess: (result) => {
      attempt.current = null;
      const number = result.bill.billNumber;
      if (result.outcome === 'price-changed') {
        toast.error(`Bill ${number} ${result.bill.status === 'DRAFT' ? 'saved as a draft' : 'completed'} with updated membership pricing. Confirm the amount and record payment from Bills.`);
      } else if (result.outcome === 'draft') {
        toast.success(`Draft bill ${number} saved`);
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
