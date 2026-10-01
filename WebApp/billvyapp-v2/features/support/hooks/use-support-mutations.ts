'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import {
  createSupportTicket,
  updateSupportTicketStatus,
  type CreateSupportTicketPayload,
  type UpdateSupportTicketStatusPayload,
} from '../services/support.service';
import type { SupportTicketRow } from '../types/support.types';
import { SUPPORT_QUERY_KEY } from './use-support';

export function useCreateSupportTicket(
  onSuccess?: (row: SupportTicketRow) => void,
) {
  const queryClient = useQueryClient();
  return useMutation<SupportTicketRow, ApiError, CreateSupportTicketPayload>({
    mutationFn: createSupportTicket,
    onSuccess: (row) => {
      toast.success(`${row.displayId} created`);
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY });
      onSuccess?.(row);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateSupportTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    SupportTicketRow,
    ApiError,
    UpdateSupportTicketStatusPayload
  >({
    mutationFn: updateSupportTicketStatus,
    onSuccess: (row) => {
      toast.success(`${row.displayId} marked ${row.statusLabel}`);
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEY });
    },
    onError: (error) => toast.error(error.message),
  });
}
