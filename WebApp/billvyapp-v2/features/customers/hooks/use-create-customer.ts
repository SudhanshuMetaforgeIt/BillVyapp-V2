'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { CUSTOMER_SEARCH_QUERY_KEY } from '@/features/walk-in-billing/hooks/use-customer-search';
import { createCustomer } from '../services/customers.service';
import type {
  CreateCustomerPayload,
  CustomerApiItem,
} from '../types/customers.types';
import { CUSTOMERS_QUERY_KEY } from './use-customers';

export function useCreateCustomer(
  onSuccess?: (customer: CustomerApiItem) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<CustomerApiItem, ApiError, CreateCustomerPayload>({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      toast.success(`${customer.firstName} ${customer.lastName} added`);
      void queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_SEARCH_QUERY_KEY });
      onSuccess?.(customer);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
