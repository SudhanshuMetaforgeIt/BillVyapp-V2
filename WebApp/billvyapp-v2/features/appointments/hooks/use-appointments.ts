'use client';

import { useQuery } from '@tanstack/react-query';

import {
  fetchAppointmentsPage,
  listStaffOptions,
} from '../services/appointments.service';
import type { AppointmentsListParams } from '../types/appointments.types';

export const APPOINTMENTS_QUERY_KEY = ['appointments', 'manager'] as const;

export function useAppointments(params: AppointmentsListParams) {
  return useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, params],
    queryFn: () => fetchAppointmentsPage(params),
  });
}

export function useStaffOptions(enabled = true) {
  return useQuery({
    queryKey: [...APPOINTMENTS_QUERY_KEY, 'staff-options'],
    queryFn: listStaffOptions,
    enabled,
  });
}
