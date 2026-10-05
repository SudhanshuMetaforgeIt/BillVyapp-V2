'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import {
  createPlan,
  updatePlan,
  updatePlanStatus,
} from '../services/plans.service';
import type { CreatePlanPayload, PlatformPlan } from '../types/plans.types';
import { PLANS_QUERY_KEY } from './use-plans';

export function useCreatePlan(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<PlatformPlan, ApiError, CreatePlanPayload>({
    mutationFn: createPlan,
    onSuccess: (plan) => {
      toast.success(`${plan.name} created`);
      void queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePlan(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<
    PlatformPlan,
    ApiError,
    { id: string; payload: CreatePlanPayload; previousStatus: PlatformPlan['status'] }
  >({
    mutationFn: async ({ id, payload, previousStatus }) => {
      const updated = await updatePlan(id, payload);
      if (payload.status !== previousStatus) {
        return updatePlanStatus(id, payload.status === 'active');
      }
      return updated;
    },
    onSuccess: (plan) => {
      toast.success(`${plan.name} updated`);
      void queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation<PlatformPlan, ApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => updatePlanStatus(id, isActive),
    onSuccess: (plan) => {
      toast.success(`${plan.name} ${plan.status === 'active' ? 'activated' : 'deactivated'}`);
      void queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
