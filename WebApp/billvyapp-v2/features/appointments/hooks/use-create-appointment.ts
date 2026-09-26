'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import {
  createAppointment,
  updateAppointmentStatus,
} from '../services/appointments.service';
import type {
  AppointmentApiItem,
  AppointmentStatus,
  CreateAppointmentPayload,
} from '../types/appointments.types';

export function useCreateAppointment(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<AppointmentApiItem, ApiError, CreateAppointmentPayload>({
    mutationFn: createAppointment,
    onSuccess: (appointment) => {
      toast.success(`${appointment.appointmentNumber} booked`);
      void invalidateAfter(queryClient, 'appointments');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    AppointmentApiItem,
    ApiError,
    { id: string; status: AppointmentStatus }
  >({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, status),
    onSuccess: (appointment) => {
      toast.success(`${appointment.appointmentNumber} updated`);
      void invalidateAfter(queryClient, 'appointments');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
