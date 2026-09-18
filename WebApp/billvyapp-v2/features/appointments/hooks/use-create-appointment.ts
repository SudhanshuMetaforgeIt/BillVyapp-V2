'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import { MANAGER_DASHBOARD_QUERY_KEY } from '@/features/dashboard/hooks/use-manager-dashboard';
import { createAppointment } from '../services/appointments.service';
import type {
  AppointmentApiItem,
  CreateAppointmentPayload,
} from '../types/appointments.types';
import { APPOINTMENTS_QUERY_KEY } from './use-appointments';

export function useCreateAppointment(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<AppointmentApiItem, ApiError, CreateAppointmentPayload>({
    mutationFn: createAppointment,
    onSuccess: (appointment) => {
      toast.success(`${appointment.appointmentNumber} booked`);
      void queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: MANAGER_DASHBOARD_QUERY_KEY,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
