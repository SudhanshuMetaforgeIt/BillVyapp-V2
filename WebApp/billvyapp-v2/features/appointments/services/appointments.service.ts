import { format, addDays } from 'date-fns';

import { api } from '@/services/api-client';
import { formatFullName } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  AppointmentApiItem,
  AppointmentListRow,
  AppointmentStatus,
  AppointmentStatusTab,
  AppointmentsListParams,
  AppointmentsPageData,
  CreateAppointmentPayload,
  DatePreset,
  PaginatedResponse,
  StaffOption,
} from '../types/appointments.types';

type CustomerApiItem = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

type UserApiItem = {
  id: string;
  firstName: string;
  lastName: string;
  role?: { code?: string } | string;
};

type RoleApiItem = {
  id: string;
  code: string;
  name: string;
};

const UPCOMING_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
];

function toAmountDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function dateRangeForPreset(preset: DatePreset): {
  dateFrom?: string;
  dateTo?: string;
} {
  const today = new Date();
  if (preset === 'today') {
    const d = toAmountDate(today);
    return { dateFrom: d, dateTo: d };
  }
  if (preset === 'tomorrow') {
    const d = toAmountDate(addDays(today, 1));
    return { dateFrom: d, dateTo: d };
  }
  if (preset === 'week') {
    return {
      dateFrom: toAmountDate(today),
      dateTo: toAmountDate(addDays(today, 6)),
    };
  }
  return {};
}

function statusLabel(status: AppointmentStatus): string {
  if (UPCOMING_STATUSES.includes(status)) {
    if (status === 'IN_PROGRESS') return 'In Progress';
    return 'Upcoming';
  }
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'NO_SHOW') return 'No Show';
  return status;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function matchesTab(
  status: AppointmentStatus,
  tab: AppointmentStatusTab,
): boolean {
  if (tab === 'all') return true;
  if (tab === 'upcoming') return UPCOMING_STATUSES.includes(status);
  if (tab === 'completed') return status === 'COMPLETED';
  if (tab === 'cancelled') return status === 'CANCELLED';
  if (tab === 'no_show') return status === 'NO_SHOW';
  return true;
}

function apiStatusForTab(
  tab: AppointmentStatusTab,
): AppointmentStatus | undefined {
  if (tab === 'completed') return 'COMPLETED';
  if (tab === 'cancelled') return 'CANCELLED';
  if (tab === 'no_show') return 'NO_SHOW';
  return undefined;
}

async function countAppointments(params: Record<string, string | undefined>) {
  const page = await api.get<PaginatedResponse<AppointmentApiItem>>(
    '/appointments',
    {
      params: { page: 1, limit: 1, ...params },
    },
  );
  return page.meta.total;
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

async function buildMetrics(): Promise<DashboardMetric[]> {
  const today = toAmountDate(new Date());
  const yesterday = toAmountDate(addDays(new Date(), -1));

  const [
    todayCount,
    yesterdayCount,
    upcomingPending,
    upcomingConfirmed,
    upcomingInProgress,
    yesterdayUpcomingPending,
    yesterdayUpcomingConfirmed,
    yesterdayUpcomingInProgress,
    completedToday,
    completedYesterday,
    cancelledToday,
    cancelledYesterday,
    noShowToday,
    noShowYesterday,
  ] = await Promise.all([
    countAppointments({ dateFrom: today, dateTo: today }),
    countAppointments({ dateFrom: yesterday, dateTo: yesterday }),
    countAppointments({ status: 'PENDING' }),
    countAppointments({ status: 'CONFIRMED' }),
    countAppointments({ status: 'IN_PROGRESS' }),
    countAppointments({
      status: 'PENDING',
      dateFrom: yesterday,
      dateTo: yesterday,
    }),
    countAppointments({
      status: 'CONFIRMED',
      dateFrom: yesterday,
      dateTo: yesterday,
    }),
    countAppointments({
      status: 'IN_PROGRESS',
      dateFrom: yesterday,
      dateTo: yesterday,
    }),
    countAppointments({
      status: 'COMPLETED',
      dateFrom: today,
      dateTo: today,
    }),
    countAppointments({
      status: 'COMPLETED',
      dateFrom: yesterday,
      dateTo: yesterday,
    }),
    countAppointments({
      status: 'CANCELLED',
      dateFrom: today,
      dateTo: today,
    }),
    countAppointments({
      status: 'CANCELLED',
      dateFrom: yesterday,
      dateTo: yesterday,
    }),
    countAppointments({
      status: 'NO_SHOW',
      dateFrom: today,
      dateTo: today,
    }),
    countAppointments({
      status: 'NO_SHOW',
      dateFrom: yesterday,
      dateTo: yesterday,
    }),
  ]);

  const upcoming =
    upcomingPending + upcomingConfirmed + upcomingInProgress;
  const upcomingYesterday =
    yesterdayUpcomingPending +
    yesterdayUpcomingConfirmed +
    yesterdayUpcomingInProgress;

  return [
    {
      id: 'appt-today',
      label: "Today's Appointments",
      value: String(todayCount),
      rawValue: todayCount,
      comparisonLabel: 'vs yesterday',
      changePercent: percentChange(todayCount, yesterdayCount),
      tone: 'accent',
      comparisonIsPlaceholder:
        percentChange(todayCount, yesterdayCount) === null,
    },
    {
      id: 'appt-upcoming',
      label: 'Upcoming',
      value: String(upcoming),
      rawValue: upcoming,
      comparisonLabel: 'vs yesterday',
      changePercent: percentChange(upcoming, upcomingYesterday),
      tone: 'accent',
      comparisonIsPlaceholder:
        percentChange(upcoming, upcomingYesterday) === null,
    },
    {
      id: 'appt-completed',
      label: 'Completed',
      value: String(completedToday),
      rawValue: completedToday,
      comparisonLabel: 'vs yesterday',
      changePercent: percentChange(completedToday, completedYesterday),
      tone: 'success',
      comparisonIsPlaceholder:
        percentChange(completedToday, completedYesterday) === null,
    },
    {
      id: 'appt-cancelled',
      label: 'Cancelled',
      value: String(cancelledToday),
      rawValue: cancelledToday,
      comparisonLabel: 'vs yesterday',
      changePercent: percentChange(cancelledToday, cancelledYesterday),
      tone: 'neutral',
      comparisonIsPlaceholder:
        percentChange(cancelledToday, cancelledYesterday) === null,
    },
    {
      id: 'appt-no-show',
      label: 'No Show',
      value: String(noShowToday),
      rawValue: noShowToday,
      comparisonLabel: 'vs yesterday',
      changePercent: percentChange(noShowToday, noShowYesterday),
      tone: 'neutral',
      comparisonIsPlaceholder:
        percentChange(noShowToday, noShowYesterday) === null,
    },
  ];
}

function mapRow(
  row: AppointmentApiItem,
  customers: Map<string, CustomerApiItem>,
  staff: Map<string, UserApiItem>,
): AppointmentListRow {
  const customer = customers.get(row.customerId);
  const customerName = customer
    ? formatFullName(customer)
    : '—';
  const staffUser = row.staffId ? staff.get(row.staffId) : undefined;
  const lineStaffId = row.services.find((s) => s.staffId)?.staffId;
  const lineStaff = lineStaffId ? staff.get(lineStaffId) : undefined;
  const staffPerson = staffUser ?? lineStaff;
  const staffName = staffPerson ? formatFullName(staffPerson) : '—';
  const primary = row.services[0];
  const extra =
    row.services.length > 1 ? ` +${row.services.length - 1}` : '';

  return {
    id: row.id,
    appointmentNumber: row.appointmentNumber,
    customerId: row.customerId,
    customerName,
    customerPhone: customer?.phone ?? '',
    customerInitials: initials(customerName === '—' ? 'NA' : customerName),
    serviceLabel: primary ? `${primary.name}${extra}` : '—',
    staffId: row.staffId,
    staffName,
    staffInitials: initials(staffName === '—' ? 'NA' : staffName),
    appointmentDate: row.appointmentDate,
    startTime: row.startTime,
    endTime: row.endTime,
    durationMinutes: row.totalDurationMinutes,
    status: row.status,
    statusLabel: statusLabel(row.status),
    sourceLabel: '—',
  };
}

export async function fetchAppointmentsPage(
  params: AppointmentsListParams,
): Promise<AppointmentsPageData> {
  const range = dateRangeForPreset(params.datePreset);
  const status = apiStatusForTab(params.statusTab);
  const needsClientFilter =
    params.statusTab === 'upcoming' ||
    params.search.trim().length > 0 ||
    Boolean(params.serviceId);

  const fetchLimit = needsClientFilter ? 100 : params.limit;
  const fetchPage = needsClientFilter ? 1 : params.page;

  const [appointmentsPage, customersPage, metrics] = await Promise.all([
    api.get<PaginatedResponse<AppointmentApiItem>>('/appointments', {
      params: {
        page: fetchPage,
        limit: fetchLimit,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        staffId: params.staffId || undefined,
        status,
      },
    }),
    api.get<PaginatedResponse<CustomerApiItem>>('/customers', {
      params: { page: 1, limit: 100 },
    }),
    buildMetrics(),
  ]);

  const staffIds = new Set<string>();
  for (const row of appointmentsPage.data) {
    if (row.staffId) staffIds.add(row.staffId);
    for (const line of row.services) {
      if (line.staffId) staffIds.add(line.staffId);
    }
  }

  const staffMap = new Map<string, UserApiItem>();
  if (staffIds.size > 0) {
    const usersPage = await api.get<PaginatedResponse<UserApiItem>>('/users', {
      params: { page: 1, limit: 100, isActive: true },
    });
    for (const user of usersPage.data) {
      staffMap.set(user.id, user);
    }
  }

  const customerMap = new Map(
    customersPage.data.map((customer) => [customer.id, customer]),
  );

  let rows = appointmentsPage.data.map((row) =>
    mapRow(row, customerMap, staffMap),
  );

  if (params.statusTab === 'upcoming') {
    rows = rows.filter((row) => matchesTab(row.status, 'upcoming'));
  }

  if (params.serviceId) {
    const serviceIds = new Set(
      appointmentsPage.data
        .filter((row) =>
          row.services.some((s) => s.serviceId === params.serviceId),
        )
        .map((row) => row.id),
    );
    rows = rows.filter((row) => serviceIds.has(row.id));
  }

  const search = params.search.trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) => {
      const phone = row.customerPhone.replace(/\D/g, '');
      const q = search.replace(/\D/g, '');
      return (
        row.customerName.toLowerCase().includes(search) ||
        row.appointmentNumber.toLowerCase().includes(search) ||
        (q.length > 0 && phone.includes(q))
      );
    });
  }

  if (needsClientFilter) {
    const total = rows.length;
    const start = (params.page - 1) * params.limit;
    const pageRows = rows.slice(start, start + params.limit);
    return {
      rows: pageRows,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / params.limit),
      },
      metrics,
    };
  }

  return {
    rows,
    meta: appointmentsPage.meta,
    metrics,
  };
}

export async function listStaffOptions(): Promise<StaffOption[]> {
  const roles = await api.get<RoleApiItem[]>('/roles');
  const staffRole = roles.find((role) => role.code === 'STAFF');
  const page = await api.get<PaginatedResponse<UserApiItem>>('/users', {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
      roleId: staffRole?.id,
    },
  });
  return page.data.map((user) => ({
    id: user.id,
    name: formatFullName(user),
  }));
}

export async function createAppointment(payload: CreateAppointmentPayload) {
  return api.post<AppointmentApiItem>('/appointments', payload);
}
