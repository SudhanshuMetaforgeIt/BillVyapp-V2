import { api } from '@/services/api-client';
import type { Bill } from '@/types/models';
import type { AppointmentApiItem } from '@/features/appointments/types/appointments.types';
export function createInstituteInvoice(appointmentId: string) {
  return api.post<Bill>(`/institute-appointments/${appointmentId}/invoice`, {});
}
export function retryInstituteEmails(appointmentId: string) {
  return api.post<AppointmentApiItem>(`/institute-appointments/${appointmentId}/retry-emails`, {});
}
