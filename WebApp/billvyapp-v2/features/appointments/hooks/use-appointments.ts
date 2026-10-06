'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/capabilities';
import { QUERY_FRESHNESS } from '@/lib/query-freshness';
import {
  fetchAppointmentsPage,
  listStaffOptions,
} from '../services/appointments.service';
import type { AppointmentsListParams } from '../types/appointments.types';

export const APPOINTMENTS_QUERY_KEY = ['appointments', 'list'] as const;

export function useAppointments(params: AppointmentsListParams) {
  const user = useCurrentUser();
  const canListUsers = can(user, 'users.read');
  return useScopedQuery([...APPOINTMENTS_QUERY_KEY, params, canListUsers], () =>
    fetchAppointmentsPage(params, { canListUsers }),
    { staleTime: QUERY_FRESHNESS.live, refetchOnWindowFocus: true },
  );
}

/** Staff pickers need GET /roles + /users, which only SUPER_ADMIN/ADMIN may call. */
export function useStaffOptions(enabled = true, salonId?: string | null) {
  return useScopedQuery(
    [...APPOINTMENTS_QUERY_KEY, 'staff-options', salonId ?? null],
    () => listStaffOptions(salonId),
    { enabled, capability: 'users.read', staleTime: QUERY_FRESHNESS.catalog },
  );
}
