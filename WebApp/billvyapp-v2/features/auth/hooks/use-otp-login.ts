'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { dashboardHomeFor } from '@/constants/routes';
import {
  authService,
  type SendOtpPayload,
  type SendOtpResponse,
  type VerifyOtpPayload,
} from '@/services/auth.service';
import type { ApiError } from '@/types/api.types';
import type { AuthSession } from '@/types/user.types';
import { useEstablishSession } from './use-establish-session';

/**
 * Requests a login code.
 *
 * The backend deliberately answers identically for registered and unregistered
 * numbers, so the success toast must stay generic - showing "number not found"
 * would reintroduce the account enumeration the backend is avoiding.
 */
export function useSendOtp() {
  return useMutation<SendOtpResponse, ApiError, SendOtpPayload>({
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
  const establishSession = useEstablishSession();

  return useMutation<AuthSession, ApiError, VerifyOtpPayload>({
    mutationFn: (payload) => authService.verifyOtp(payload),
    onSuccess: (session) => {
      establishSession(session);
      toast.success(`Welcome, ${session.user.firstName}`);
      router.replace(dashboardHomeFor(session.user.role));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
