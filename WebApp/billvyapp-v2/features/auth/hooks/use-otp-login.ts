'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { dashboardHomeFor } from '@/constants/routes';
import {
  authService,
  type SendOtpPayload,
  type VerifyOtpPayload,
} from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError, MessageResponse } from '@/types/api.types';
import type { AuthSession } from '@/types/user.types';

/**
 * Requests a login code.
 *
 * The backend deliberately answers identically for registered and unregistered
 * numbers, so the success toast must stay generic - showing "number not found"
 * would reintroduce the account enumeration the backend is avoiding.
 */
export function useSendOtp() {
  return useMutation<MessageResponse, ApiError, SendOtpPayload>({
    mutationFn: (payload) => authService.sendOtp(payload),
    onSuccess: (response) => {
      toast.success(response.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Exchanges a code for a session and routes the user to their dashboard. */
export function useVerifyOtp() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation<AuthSession, ApiError, VerifyOtpPayload>({
    mutationFn: (payload) => authService.verifyOtp(payload),
    onSuccess: (session) => {
      setSession(session);
      toast.success(`Welcome, ${session.user.firstName}`);
      router.replace(dashboardHomeFor(session.user.role));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
