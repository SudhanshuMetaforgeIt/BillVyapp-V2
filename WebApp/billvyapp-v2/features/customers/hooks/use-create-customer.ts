'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { invalidateAfter, invalidatePaths } from '@/lib/query-invalidation';
import { createCustomer } from '../services/customers.service';
import type {
  CreateCustomerPayload,
  CustomerApiItem,
} from '../types/customers.types';

export function useCreateCustomer(
  onSuccess?: (customer: CustomerApiItem) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<CustomerApiItem, ApiError, CreateCustomerPayload>({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      toast.success(`${customer.firstName} ${customer.lastName} added`);
      void invalidateAfter(queryClient, 'customers');
      void invalidatePaths(queryClient, [['dashboard']]);
      onSuccess?.(customer);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
