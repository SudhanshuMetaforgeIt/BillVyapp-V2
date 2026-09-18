'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { createCustomer } from '../services/walk-in-billing.service';
import type {
  CreateCustomerPayload,
  WalkInCustomer,
} from '../types/walk-in-billing.types';
import { CUSTOMER_SEARCH_QUERY_KEY } from './use-customer-search';

export function useCreateCustomer(onSuccess?: (customer: WalkInCustomer) => void) {
  const queryClient = useQueryClient();

  return useMutation<WalkInCustomer, ApiError, CreateCustomerPayload>({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      toast.success(`${customer.firstName} ${customer.lastName} added`);
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_SEARCH_QUERY_KEY });
      onSuccess?.(customer);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
