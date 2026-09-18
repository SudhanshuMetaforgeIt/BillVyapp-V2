'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import {
  createMembership,
  createMembershipPlan,
} from '../services/memberships.service';
import type {
  CreateMembershipPayload,
  CreateMembershipPlanPayload,
  MembershipApiItem,
  MembershipPlanApiItem,
} from '../types/memberships.types';
import { MEMBERSHIPS_QUERY_KEY } from './use-memberships';

export function useCreateMembership(
  onSuccess?: (row: MembershipApiItem) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<MembershipApiItem, ApiError, CreateMembershipPayload>({
    mutationFn: createMembership,
    onSuccess: (row) => {
      toast.success('Member added');
      void queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY });
      onSuccess?.(row);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateMembershipPlan(
  onSuccess?: (plan: MembershipPlanApiItem) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<
    MembershipPlanApiItem,
    ApiError,
    CreateMembershipPlanPayload
  >({
    mutationFn: createMembershipPlan,
    onSuccess: (plan) => {
      toast.success(`${plan.name} plan created`);
      void queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_QUERY_KEY });
      onSuccess?.(plan);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
