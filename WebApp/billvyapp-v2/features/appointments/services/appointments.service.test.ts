import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { fetchAppointmentsPage } from './appointments.service';
import type { AppointmentApiItem, AppointmentStatus, AppointmentsListParams } from '../types/appointments.types';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));

const params: AppointmentsListParams = {
  page: 1, limit: 10, search: '', statusTab: 'all', datePreset: 'all', serviceId: '', staffId: '',
};
const labels = [
  ['PENDING', 'Pending'], ['CONFIRMED', 'Confirmed'], ['IN_PROGRESS', 'In Progress'],
  ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled'], ['NO_SHOW', 'No Show'],
] as const;

function respondWith(statuses: readonly AppointmentStatus[]) {
  const appointments: AppointmentApiItem[] = statuses.map((status, index) => ({
    id: `appointment-${index}`, salonId: 'salon', customerId: 'customer', staffId: null,
    appointmentNumber: `APT-${index}`, appointmentDate: '2026-10-31', startTime: '10:00',
    endTime: '10:30', totalDurationMinutes: 30, status, notes: null, services: [],
    createdAt: '2026-10-27T00:00:00Z', updatedAt: '2026-10-27T00:00:00Z',
  }));
  vi.mocked(api.get).mockImplementation(async url => {
    if (url === '/customers/customer') return { id: 'customer', firstName: 'Test', lastName: 'Customer', phone: '+919876543210', email: 'customer@example.test' };
    return { data: appointments, meta: { page: 1, limit: 10, total: appointments.length, totalPages: 1 } };
  });
}

beforeEach(() => vi.resetAllMocks());

describe('appointment status display', () => {
  it.each(labels)('displays %s as %s', async (status, label) => {
    respondWith([status]);
    const result = await fetchAppointmentsPage(params, { canListUsers: false });
    expect(result.rows[0]).toMatchObject({ status, statusLabel: label });
  });

  it('keeps distinct statuses in the Upcoming group', async () => {
    respondWith(labels.map(([status]) => status));
    const result = await fetchAppointmentsPage({ ...params, statusTab: 'upcoming' }, { canListUsers: false });
    expect(result.rows.map(row => [row.status, row.statusLabel])).toEqual(labels.slice(0, 3));
    expect(result.meta.total).toBe(3);
  });
});
