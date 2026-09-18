import { format, startOfMonth, subDays, subMonths } from 'date-fns';

import { api } from '@/services/api-client';
import type { RevenuePoint } from '../data/placeholders';
import type {
  AppointmentListItem,
  BillListItem,
  CustomerListItem,
  FranchiseListItem,
  NotificationListItem,
  PaginatedResponse,
  PaymentListItem,
  UserListItem,
} from '../types/dashboard.types';

export type MetricTone = 'neutral' | 'success' | 'accent';

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  comparisonLabel: string;
  changePercent: number | null;
  tone: MetricTone;
  /** true when comparison is placeholder until MoM analytics exist */
  comparisonIsPlaceholder: boolean;
};

export type RecentBusinessRow = {
  id: string;
  name: string;
  code: string;
  ownerLabel: string;
  planLabel: string;
  planTone: 'basic' | 'professional' | 'unknown';
  status: 'active' | 'inactive' | 'pending';
  statusLabel: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: 'success' | 'accent' | 'warning' | 'danger' | 'neutral';
};

export type SuperAdminDashboardData = {
  metrics: DashboardMetric[];
  recentBusinesses: RecentBusinessRow[];
  activity: ActivityItem[];
  unreadNotifications: number;
  revenueSeries: RevenuePoint[];
  revenueMonthTotal: number;
};

async function sumSuccessfulPayments(
  dateFrom: string,
  dateTo: string,
): Promise<number> {
  const page = await api.get<PaginatedResponse<PaymentListItem>>('/payments', {
    params: {
      status: 'SUCCESS',
      dateFrom,
      dateTo,
      page: 1,
      limit: 100,
    },
  });

  return page.data.reduce((sum, row) => {
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function mapFranchiseRow(row: FranchiseListItem): RecentBusinessRow {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    ownerLabel: row.email ?? row.phone ?? '—',
    // Plans are not on the franchise API yet.
    planLabel: '—',
    planTone: 'unknown',
    status: row.isActive ? 'active' : 'inactive',
    statusLabel: row.isActive ? 'Active' : 'Inactive',
  };
}

function mapNotification(row: NotificationListItem): ActivityItem {
  const tone =
    row.status === 'FAILED' || row.status === 'CANCELLED'
      ? 'danger'
      : row.status === 'SENT' || row.status === 'DELIVERED'
        ? 'success'
        : 'neutral';

  return {
    id: row.id,
    title: row.subject?.trim() || row.notificationType.replaceAll('_', ' '),
    description: row.message,
    timestamp: row.createdAt,
    tone,
  };
}

/**
 * Aggregates Super Admin dashboard widgets from existing list endpoints.
 * There is no dedicated Nest dashboard aggregate API yet.
 */
export async function fetchSuperAdminDashboard(): Promise<SuperAdminDashboardData> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = subDays(thisMonthStart, 1);

  const thisMonth = {
    dateFrom: format(thisMonthStart, 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
  };
  const lastMonth = {
    dateFrom: format(lastMonthStart, 'yyyy-MM-dd'),
    dateTo: format(lastMonthEnd, 'yyyy-MM-dd'),
  };

  const [
    franchisesTotal,
    franchisesActive,
    franchisesRecent,
    usersPage,
    customersPage,
    thisMonthRevenue,
    lastMonthRevenue,
    notificationsPage,
  ] = await Promise.all([
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 1 },
    }),
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 1, isActive: true },
    }),
    api.get<PaginatedResponse<FranchiseListItem>>('/franchises', {
      params: { page: 1, limit: 5 },
    }),
    api.get<PaginatedResponse<UserListItem>>('/users', {
      params: { page: 1, limit: 1 },
    }),
    api.get<PaginatedResponse<{ id: string }>>('/customers', {
      params: { page: 1, limit: 1 },
    }),
    sumSuccessfulPayments(thisMonth.dateFrom, thisMonth.dateTo),
    sumSuccessfulPayments(lastMonth.dateFrom, lastMonth.dateTo),
    api.get<PaginatedResponse<NotificationListItem>>('/notifications', {
      params: { page: 1, limit: 8 },
    }),
  ]);

  const totalBusinesses = franchisesTotal.meta.total;
  const activeBusinesses = franchisesActive.meta.total;
  const totalUsers = usersPage.meta.total + customersPage.meta.total;

  const revenueChange =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : null;

  const metrics: DashboardMetric[] = [
    {
      id: 'total-businesses',
      label: 'Total Businesses',
      value: String(totalBusinesses),
      rawValue: totalBusinesses,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'active-businesses',
      label: 'Active Businesses',
      value: String(activeBusinesses),
      rawValue: activeBusinesses,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'total-users',
      label: 'Total Users',
      value: String(totalUsers),
      rawValue: totalUsers,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'revenue-month',
      label: 'Revenue This Month',
      value: String(thisMonthRevenue),
      rawValue: thisMonthRevenue,
      comparisonLabel: 'vs last month',
      changePercent: revenueChange,
      tone: 'accent',
      comparisonIsPlaceholder: revenueChange === null,
    },
  ];

  const activity = notificationsPage.data.map(mapNotification);
  const unreadNotifications = notificationsPage.data.filter(
    (n) => n.status === 'PENDING' || n.status === 'QUEUED',
  ).length;

  return {
    metrics,
    recentBusinesses: franchisesRecent.data.map(mapFranchiseRow),
    activity,
    unreadNotifications,
    revenueSeries: [] as RevenuePoint[],
    revenueMonthTotal: thisMonthRevenue,
  };
}

// ---------------------------------------------------------------------------
// Manager dashboard
// ---------------------------------------------------------------------------

export type SalesDayPoint = {
  dateKey: string;
  label: string;
  thisWeek: number;
  lastWeek: number;
};

export type PaymentMethodSlice = {
  method: string;
  label: string;
  amount: number;
  percent: number;
};

export type ManagerAppointmentRow = {
  id: string;
  timeLabel: string;
  customerLabel: string;
  serviceLabel: string;
  status: string;
  statusTone: 'success' | 'warning' | 'accent' | 'neutral' | 'danger';
};

export type ManagerBillRow = {
  id: string;
  billNumber: string;
  customerLabel: string;
  amount: number;
  paymentMethodLabel: string;
  paymentMethod: string | null;
  timeLabel: string;
};

export type ManagerPendingRow = {
  id: string;
  billNumber: string;
  customerLabel: string;
  amount: number;
  daysPending: number;
};

export type ManagerTopServiceRow = {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type ManagerDashboardData = {
  metrics: DashboardMetric[];
  salesSeries: SalesDayPoint[];
  paymentMethods: PaymentMethodSlice[];
  paymentMethodsTotal: number;
  todayAppointments: ManagerAppointmentRow[];
  recentBills: ManagerBillRow[];
  pendingCollection: ManagerPendingRow[];
  topServices: ManagerTopServiceRow[];
  unreadNotifications: number;
};

function toAmount(value: string | number | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function customerDisplayName(
  map: Map<string, CustomerListItem>,
  customerId: string,
): string {
  const customer = map.get(customerId);
  if (!customer) return '—';
  const name = `${customer.firstName} ${customer.lastName}`.trim();
  return name || customer.email || '—';
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function appointmentStatusTone(
  status: string,
): ManagerAppointmentRow['statusTone'] {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PENDING':
      return 'accent';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'danger';
    default:
      return 'neutral';
  }
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return method.replaceAll('_', ' ');
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/**
 * Aggregates Manager dashboard widgets from existing list endpoints only.
 * There is no dedicated Nest dashboard aggregate API yet.
 * Salon scope is enforced by the backend via the manager JWT.
 *
 * Never invents mockup numbers, chart points, bills, or appointments.
 * Empty API results surface as zeros / empty widget states in the UI.
 */
export async function fetchManagerDashboard(): Promise<ManagerDashboardData> {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
  const thisWeekStart = format(subDays(now, 6), 'yyyy-MM-dd');
  const lastWeekStart = format(subDays(now, 13), 'yyyy-MM-dd');

  const [
    todayBills,
    yesterdayBills,
    rangeBills,
    unpaidBills,
    partialBills,
    todayAppointmentsPage,
    yesterdayAppointmentsPage,
    todayPayments,
    weekPayments,
    notificationsPage,
    customersPage,
  ] = await Promise.all([
    api.get<PaginatedResponse<BillListItem>>('/bills', {
      params: { page: 1, limit: 100, dateFrom: today, dateTo: today },
    }),
    api.get<PaginatedResponse<BillListItem>>('/bills', {
      params: {
        page: 1,
        limit: 100,
        dateFrom: yesterday,
        dateTo: yesterday,
      },
    }),
    api.get<PaginatedResponse<BillListItem>>('/bills', {
      params: {
        page: 1,
        limit: 100,
        dateFrom: lastWeekStart,
        dateTo: today,
      },
    }),
    api.get<PaginatedResponse<BillListItem>>('/bills', {
      params: {
        page: 1,
        limit: 100,
        paymentStatus: 'UNPAID',
      },
    }),
    api.get<PaginatedResponse<BillListItem>>('/bills', {
      params: {
        page: 1,
        limit: 100,
        paymentStatus: 'PARTIAL',
      },
    }),
    api.get<PaginatedResponse<AppointmentListItem>>('/appointments', {
      params: { page: 1, limit: 100, dateFrom: today, dateTo: today },
    }),
    api.get<PaginatedResponse<AppointmentListItem>>('/appointments', {
      params: {
        page: 1,
        limit: 100,
        dateFrom: yesterday,
        dateTo: yesterday,
      },
    }),
    api.get<PaginatedResponse<PaymentListItem>>('/payments', {
      params: {
        page: 1,
        limit: 100,
        status: 'SUCCESS',
        dateFrom: today,
        dateTo: today,
      },
    }),
    api.get<PaginatedResponse<PaymentListItem>>('/payments', {
      params: {
        page: 1,
        limit: 100,
        status: 'SUCCESS',
        dateFrom: thisWeekStart,
        dateTo: today,
      },
    }),
    api.get<PaginatedResponse<NotificationListItem>>('/notifications', {
      params: { page: 1, limit: 20 },
    }),
    api.get<PaginatedResponse<CustomerListItem>>('/customers', {
      params: { page: 1, limit: 100 },
    }),
  ]);

  const customerMap = new Map(
    customersPage.data.map((customer) => [customer.id, customer]),
  );

  const nonDraftToday = todayBills.data.filter((b) => b.status !== 'DRAFT');
  const nonDraftYesterday = yesterdayBills.data.filter(
    (b) => b.status !== 'DRAFT',
  );

  const todaySales = todayPayments.data.reduce(
    (sum, row) => sum + toAmount(row.amount),
    0,
  );
  const yesterdaySalesTotal = nonDraftYesterday.reduce(
    (sum, bill) => sum + toAmount(bill.paidAmount),
    0,
  );

  const walkInsToday = nonDraftToday.length;
  const walkInsYesterday = nonDraftYesterday.length;
  const appointmentsToday = todayAppointmentsPage.meta.total;
  const appointmentsYesterday = yesterdayAppointmentsPage.meta.total;

  const avgBillToday =
    nonDraftToday.length > 0
      ? nonDraftToday.reduce((sum, b) => sum + toAmount(b.total), 0) /
        nonDraftToday.length
      : 0;
  const avgBillYesterday =
    nonDraftYesterday.length > 0
      ? nonDraftYesterday.reduce((sum, b) => sum + toAmount(b.total), 0) /
        nonDraftYesterday.length
      : 0;

  const pendingBills = [...unpaidBills.data, ...partialBills.data].filter(
    (b) => toAmount(b.dueAmount) > 0 && b.status !== 'CANCELLED',
  );
  const pendingTotal = pendingBills.reduce(
    (sum, b) => sum + toAmount(b.dueAmount),
    0,
  );

  const salesChange = percentChange(todaySales, yesterdaySalesTotal);
  const walkInChange = percentChange(walkInsToday, walkInsYesterday);
  const appointmentChange = percentChange(
    appointmentsToday,
    appointmentsYesterday,
  );
  const avgBillChange = percentChange(avgBillToday, avgBillYesterday);

  const metrics: DashboardMetric[] = [
    {
      id: 'manager-today-sales',
      label: "Today's Sales",
      value: String(todaySales),
      rawValue: todaySales,
      comparisonLabel: 'vs yesterday',
      changePercent: salesChange,
      tone: 'accent',
      comparisonIsPlaceholder: salesChange === null,
    },
    {
      id: 'manager-walk-ins',
      label: 'Walk-ins',
      value: String(walkInsToday),
      rawValue: walkInsToday,
      comparisonLabel: 'vs yesterday',
      changePercent: walkInChange,
      tone: 'neutral',
      comparisonIsPlaceholder: walkInChange === null,
    },
    {
      id: 'manager-appointments',
      label: 'Appointments',
      value: String(appointmentsToday),
      rawValue: appointmentsToday,
      comparisonLabel: 'vs yesterday',
      changePercent: appointmentChange,
      tone: 'neutral',
      comparisonIsPlaceholder: appointmentChange === null,
    },
    {
      id: 'manager-avg-bill',
      label: 'Avg. Bill Value',
      value: String(avgBillToday),
      rawValue: avgBillToday,
      comparisonLabel: 'vs yesterday',
      changePercent: avgBillChange,
      tone: 'accent',
      comparisonIsPlaceholder: avgBillChange === null,
    },
    {
      id: 'manager-pending-collection',
      label: 'Pending Collection',
      value: String(pendingTotal),
      rawValue: pendingTotal,
      comparisonLabel: 'open dues',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];

  // Sales overview from paid bills only. Empty series when API has no activity.
  const thisWeekTotals = new Map<string, number>();
  const lastWeekTotals = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    thisWeekTotals.set(format(subDays(now, 6 - i), 'yyyy-MM-dd'), 0);
    lastWeekTotals.set(format(subDays(now, 13 - i), 'yyyy-MM-dd'), 0);
  }

  for (const bill of rangeBills.data) {
    if (bill.status === 'DRAFT' || bill.status === 'CANCELLED') continue;
    const key = bill.billDate.slice(0, 10);
    const amount = toAmount(bill.paidAmount);
    if (amount <= 0) continue;
    if (thisWeekTotals.has(key)) {
      thisWeekTotals.set(key, (thisWeekTotals.get(key) ?? 0) + amount);
    } else if (lastWeekTotals.has(key)) {
      lastWeekTotals.set(key, (lastWeekTotals.get(key) ?? 0) + amount);
    }
  }

  const hasSalesActivity = [
    ...thisWeekTotals.values(),
    ...lastWeekTotals.values(),
  ].some((amount) => amount > 0);

  const salesSeries: SalesDayPoint[] = hasSalesActivity
    ? Array.from({ length: 7 }, (_, i) => {
        const thisDate = subDays(now, 6 - i);
        const lastDate = subDays(now, 13 - i);
        const thisKey = format(thisDate, 'yyyy-MM-dd');
        const lastKey = format(lastDate, 'yyyy-MM-dd');
        return {
          dateKey: thisKey,
          label: format(thisDate, 'MMM d'),
          thisWeek: thisWeekTotals.get(thisKey) ?? 0,
          lastWeek: lastWeekTotals.get(lastKey) ?? 0,
        };
      })
    : [];

  // Payment methods only when the API provides a method + positive amount.
  const methodTotals = new Map<string, number>();
  for (const payment of weekPayments.data) {
    if (!payment.paymentMethod) continue;
    const amount = toAmount(payment.amount);
    if (amount <= 0) continue;
    methodTotals.set(
      payment.paymentMethod,
      (methodTotals.get(payment.paymentMethod) ?? 0) + amount,
    );
  }
  const paymentMethodsTotal = Array.from(methodTotals.values()).reduce(
    (a, b) => a + b,
    0,
  );
  const paymentMethods: PaymentMethodSlice[] = Array.from(methodTotals.entries())
    .map(([method, amount]) => ({
      method,
      label: paymentMethodLabel(method),
      amount,
      percent:
        paymentMethodsTotal > 0
          ? Math.round((amount / paymentMethodsTotal) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  const todayAppointments: ManagerAppointmentRow[] =
    todayAppointmentsPage.data
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((row) => {
        const primaryService = row.services[0]?.name ?? '—';
        const extra =
          row.services.length > 1 ? ` +${row.services.length - 1}` : '';
        return {
          id: row.id,
          timeLabel: row.startTime.slice(0, 5),
          customerLabel: customerDisplayName(customerMap, row.customerId),
          serviceLabel: `${primaryService}${extra}`,
          status: row.status,
          statusTone: appointmentStatusTone(row.status),
        };
      });

  const recentBills: ManagerBillRow[] = [...todayBills.data, ...rangeBills.data]
    .filter((b, index, arr) => arr.findIndex((x) => x.id === b.id) === index)
    .filter((b) => b.status !== 'DRAFT')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((bill) => {
      const successPayment = bill.payments?.find((p) => p.status === 'SUCCESS');
      const method = successPayment?.paymentMethod ?? null;
      const created = new Date(bill.createdAt);
      return {
        id: bill.id,
        billNumber: bill.billNumber,
        customerLabel: customerDisplayName(customerMap, bill.customerId),
        amount: toAmount(bill.total),
        paymentMethodLabel: paymentMethodLabel(method),
        paymentMethod: method,
        timeLabel: Number.isNaN(created.getTime())
          ? '—'
          : format(created, 'h:mm a'),
      };
    });

  const pendingCollection: ManagerPendingRow[] = pendingBills
    .slice()
    .sort((a, b) => toAmount(b.dueAmount) - toAmount(a.dueAmount))
    .slice(0, 8)
    .map((bill) => ({
      id: bill.id,
      billNumber: bill.billNumber,
      customerLabel: customerDisplayName(customerMap, bill.customerId),
      amount: toAmount(bill.dueAmount),
      daysPending: daysBetween(new Date(bill.billDate), now),
    }));

  const serviceAgg = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  for (const bill of rangeBills.data) {
    if (bill.status === 'DRAFT' || bill.status === 'CANCELLED') continue;
    for (const item of bill.items ?? []) {
      if (item.itemType !== 'SERVICE') continue;
      const amount = toAmount(item.total);
      if (item.quantity <= 0 && amount <= 0) continue;
      const key = item.serviceId ?? item.description ?? item.id;
      const name = item.description?.trim() || '—';
      const existing = serviceAgg.get(key) ?? {
        name,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += amount;
      if (item.description?.trim()) existing.name = item.description.trim();
      serviceAgg.set(key, existing);
    }
  }

  const topServices: ManagerTopServiceRow[] = Array.from(serviceAgg.entries())
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const unreadNotifications = notificationsPage.data.filter(
    (n) => n.status === 'PENDING' || n.status === 'QUEUED',
  ).length;

  return {
    metrics,
    salesSeries,
    paymentMethods,
    paymentMethodsTotal,
    todayAppointments,
    recentBills,
    pendingCollection,
    topServices,
    unreadNotifications,
  };
}
