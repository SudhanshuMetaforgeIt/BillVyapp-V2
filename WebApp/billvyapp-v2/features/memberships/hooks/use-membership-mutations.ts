"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type { ApiError } from "@/types/api.types";
import {
  createMembership,
  createMembershipPlan,
  updateMembershipPlan,
  setMembershipPlanStatus,
  updateMembership,
} from "../services/memberships.service";
import type {
  CreateMembershipPayload,
  CreateMembershipPlanPayload,
  MembershipApiItem,
  MembershipPlanApiItem,
  UpdateMembershipPayload,
} from "../types/memberships.types";

export function useCreateMembership(
  onSuccess?: (row: MembershipApiItem) => void,
) {
  const queryClient = useQueryClient();

  return useMutation<MembershipApiItem, ApiError, CreateMembershipPayload>({
    mutationFn: createMembership,
    onSuccess: (row) => {
      toast.success("Member added");
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes("memberships"),
      });
      onSuccess?.(row);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMembership(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<MembershipApiItem, ApiError, { id: string; payload: UpdateMembershipPayload }>({
    mutationFn: ({ id, payload }) => updateMembership(id, payload),
    onSuccess: () => {
      toast.success('Membership updated');
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes('memberships'),
      });
      onSuccess?.();
    },
    onError: (error) => toast.error(error.message),
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
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes("memberships"),
      });
      onSuccess?.(plan);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSaveMembershipPlan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id?: string;
      payload: CreateMembershipPlanPayload;
    }) => {
      if (!id) return createMembershipPlan(payload);
      return updateMembershipPlan(id, {
        name: payload.name,
        description: payload.description,
        price: payload.price,
        durationDays: payload.durationDays,
        enrollmentThreshold: payload.enrollmentThreshold,
        benefits: payload.benefits,
        couponUsageLimit: payload.couponUsageLimit,
        termsAndConditions: payload.termsAndConditions,
        benefitType: payload.benefitType,
        freeServicesPerVisit: payload.freeServicesPerVisit,
        freeServiceLimit: payload.freeServiceLimit,
        discountPercentage: payload.discountPercentage,
        couponPrefix: payload.couponPrefix,
        eligibleServiceIds: payload.eligibleServiceIds,
      });
    },
    onSuccess: () => {
      toast.success("Membership plan saved");
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes("memberships"),
      });
      onSuccess?.();
    },
    onError: (error: ApiError) => toast.error(error.message),
  });
}
export function useMembershipPlanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setMembershipPlanStatus(id, isActive),
    onSuccess: () => {
      toast.success("Plan status updated");
      void queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes("memberships"),
      });
    },
    onError: (error: ApiError) => toast.error(error.message),
  });
}
