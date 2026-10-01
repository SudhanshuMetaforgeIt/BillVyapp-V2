import { differenceInCalendarDays, parseISO } from 'date-fns';

import {
  businessLastNDays,
  businessMonthToDate,
  businessToday,
  businessYearToDate,
  businessYesterday,
} from '@/lib/business-calendar';
import {
  addCalendarDays,
  isDateOnlyString,
  startOfMonthBusinessDateOnly,
} from '@/lib/business-timezone';
import { formatTime } from '@/lib/format';
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
  /** Value summed from a capped page while the server holds more rows. */
  partial?: boolean;
  partialSample?: number;
};

const SAMPLE = 100;
export const REVENUE_SERIES_MAX_MONTHS = 36;
export const REVENUE_SERIES_MAX_WEEKS = 26;
export const REVENUE_SERIES_MAX_DAYS = 62;

export type RevenueBucket = 'day' | 'week' | 'month';

function truncated(page: { data: unknown[]; meta: { total: number } }): boolean {
  return page.meta.total > page.data.length;
}

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
  revenueSeries: RevenuePoint[];
  revenueMonthTotal: number;
};

async function sumSuccessfulPayments(
  dateFrom: string,
  dateTo: string,
): Promise<{ sum: number; partial: boolean }> {
  const page = await api.get<PaginatedResponse<PaymentListItem>>('/payments', {
    params: {
      status: 'SUCCESS',
      dateFrom,
      dateTo,
      page: 1,
      limit: SAMPLE,
    },
  });

  const sum = page.data.reduce((acc, row) => {
    const amount = Number(row.amount);
    return acc + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return { sum, partial: truncated(page) };
}

type SeriesBucket = {
  key: string;
  label: string;
  from: string;
  to: string;
};

/** Label a YYYY-MM-DD calendar day without shifting by browser TZ. */
function formatDateOnlyDayLabel(dateOnly: string): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function formatDateOnlyMonthLabel(dateOnly: string): string {
  const [y, m] = dateOnly.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1, 12)));
}

/** Monday-start week for a calendar date label (UTC noon weekday). */
function startOfWeekMonday(dateOnly: string): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=Sun
  const daysFromMonday = (dow + 6) % 7;
  return addCalendarDays(dateOnly, -daysFromMonday);
}

function endOfWeekSunday(weekStartMonday: string): string {
  return addCalendarDays(weekStartMonday, 6);
}

function maxDateOnly(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDateOnly(a: string, b: string): string {
  return a <= b ? a : b;
}

function buildBuckets(
  dateFrom: string,
  dateTo: string,
  bucket: RevenueBucket,
): SeriesBucket[] {
  const buckets: SeriesBucket[] = [];

  if (bucket === 'day') {
    let cursor = dateFrom;
    while (cursor <= dateTo) {
      buckets.push({
        key: cursor,
        label: formatDateOnlyDayLabel(cursor),
        from: cursor,
        to: cursor,
      });
      cursor = addCalendarDays(cursor, 1);
      if (buckets.length >= REVENUE_SERIES_MAX_DAYS) break;
    }
    return buckets;
  }

  if (bucket === 'week') {
    let cursor = startOfWeekMonday(dateFrom);
    const lastWeek = startOfWeekMonday(dateTo);
    while (cursor <= lastWeek) {
      const weekEnd = endOfWeekSunday(cursor);
      buckets.push({
        key: cursor,
        label: formatDateOnlyDayLabel(cursor),
        from: cursor,
        to: weekEnd,
      });
      cursor = addCalendarDays(cursor, 7);
      if (buckets.length >= REVENUE_SERIES_MAX_WEEKS) break;
    }
    return buckets;
  }

  let cursor = `${dateFrom.slice(0, 7)}-01`;
  const lastMonth = `${dateTo.slice(0, 7)}-01`;
  while (cursor <= lastMonth) {
    const [y, m] = cursor.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(y, m, 1)); // m is 1-based; Date.UTC month is 0-based so `m` = next month
    const monthEnd = addCalendarDays(
      `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`,
      -1,
    );
    buckets.push({
      key: cursor.slice(0, 7),
      label: formatDateOnlyMonthLabel(cursor),
      from: cursor,
      to: monthEnd,
    });
    cursor = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
    if (buckets.length >= REVENUE_SERIES_MAX_MONTHS) break;
  }
  return buckets;
}

/**
 * Revenue buckets for an arbitrary inclusive date range.
 * Each bucket is clipped to the requested window.
 * Ranges are business calendar YYYY-MM-DD labels (no browser TZ).
 */
export async function fetchRevenueSeries(
  dateFrom: string,
  dateTo: string,
  bucket: RevenueBucket = 'month',
): Promise<RevenuePoint[]> {
  if (!isDateOnlyString(dateFrom) || !isDateOnlyString(dateTo)) {
    return [];
  }
  if (dateFrom > dateTo) {
    return [];
  }

  const windows = buildBuckets(dateFrom, dateTo, bucket);
  const points = await Promise.all(
    windows.map(async (window) => {
      const rangeStart = maxDateOnly(dateFrom, window.from);
      const rangeEnd = minDateOnly(dateTo, window.to);
      if (rangeStart > rangeEnd) {
        return {
          point: {
            monthKey: window.key,
            label: window.label,
            amount: 0,
          } satisfies RevenuePoint,
          partial: false,
        };
      }
      const { sum, partial } = await sumSuccessfulPayments(rangeStart, rangeEnd);
      return {
        point: {
          monthKey: window.key,
          label: window.label,
          amount: sum,
        } satisfies RevenuePoint,
        partial,
      };
    }),
  );

  return points.some((p) => p.partial) ? [] : points.map((p) => p.point);
}

export function inferRevenueBucket(
  dateFrom: string,
  dateTo: string,
): RevenueBucket {
  const days = differenceInCalendarDays(parseISO(dateTo), parseISO(dateFrom));
  if (days <= 45) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

export type RevenuePeriodTab = 'day' | 'week' | 'month' | 'year' | 'custom';

export function revenueTabRange(tab: Exclude<RevenuePeriodTab, 'custom'>): {
  dateFrom: string;
  dateTo: string;
  bucket: RevenueBucket;
} {
  const dateTo = businessToday();

  if (tab === 'day') {
    return {
      ...businessLastNDays(14),
      bucket: 'day',
    };
  }
  if (tab === 'week') {
    return {
      dateFrom: addCalendarDays(dateTo, -7 * 7),
      dateTo,
      bucket: 'week',
    };
  }
  if (tab === 'month') {
    return {
      ...businessMonthToDate(),
      bucket: 'day',
    };
  }

  const monthStart = startOfMonthBusinessDateOnly();
  const [y, m] = monthStart.split('-').map(Number);
  const lookback = new Date(Date.UTC(y, m - 1 - 11, 1));
  return {
    dateFrom: `${lookback.getUTCFullYear()}-${String(lookback.getUTCMonth() + 1).padStart(2, '0')}-01`,
    dateTo,
    bucket: 'month',
  };
}

export function defaultRevenueDateRange(monthsBack = 6): {
  dateFrom: string;
  dateTo: string;
} {
  const dateTo = businessToday();
  const monthStart = startOfMonthBusinessDateOnly();
  const [y, m] = monthStart.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1 - Math.max(monthsBack - 1, 0), 1));
  return {
    dateFrom: `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}-01`,
    dateTo,
  };
}

export function revenuePresetRange(
  preset: '3m' | '6m' | '12m' | 'ytd',
): { dateFrom: string; dateTo: string } {
  if (preset === 'ytd') {
    return businessYearToDate();
  }
  const months = preset === '3m' ? 3 : preset === '12m' ? 12 : 6;
  return defaultRevenueDateRange(months);
}


function mapFranchiseRow(row: FranchiseListItem): RecentBusinessRow {
  const planName = row.currentPlanName?.trim() || null;
  const lower = planName?.toLowerCase() ?? '';
  const planTone: RecentBusinessRow['planTone'] = !planName
    ? 'unknown'
    : lower.includes('pro')
      ? 'professional'
      : 'basic';

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    ownerLabel: row.email ?? row.phone ?? '—',
    planLabel: planName
      ? row.subscriptionActive
        ? planName
        : `${planName} (inactive)`
      : 'Not enrolled',
    planTone,
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
  const thisMonth = businessMonthToDate();

  const [
    franchisesTotal,
    franchisesActive,
    franchisesRecent,
    usersPage,
    customersPage,
    thisMonthRevenue,
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
    api.get<PaginatedResponse<NotificationListItem>>('/notifications', {
      params: { page: 1, limit: 8 },
    }),
  ]);

  const totalBusinesses = franchisesTotal.meta.total;
  const activeBusinesses = franchisesActive.meta.total;
  const totalUsers = usersPage.meta.total + customersPage.meta.total;

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
      label: 'Revenue by Businesses',
      value: String(thisMonthRevenue.sum),
      rawValue: thisMonthRevenue.sum,
      comparisonLabel: 'this month',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: true,
      partial: thisMonthRevenue.partial,
      partialSample: SAMPLE,
    },
  ];

  const activity = notificationsPage.data.map(mapNotification);

  return {
    metrics,
    recentBusinesses: franchisesRecent.data.map(mapFranchiseRow),
    activity,
    revenueSeries: [] as RevenuePoint[],
    revenueMonthTotal: thisMonthRevenue.sum,
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
  /** Charts and lists are built from capped pages and miss some rows. */
  chartsPartial: boolean;
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

function daysBetweenDateOnly(from: string, to: string): number {
  const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from.slice(0, 10));
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to.slice(0, 10));
  if (!fromMatch || !toMatch) return 0;
  const fromUtc = Date.UTC(
    Number(fromMatch[1]),
    Number(fromMatch[2]) - 1,
    Number(fromMatch[3]),
  );
  const toUtc = Date.UTC(
    Number(toMatch[1]),
    Number(toMatch[2]) - 1,
    Number(toMatch[3]),
  );
  return Math.max(0, Math.floor((toUtc - fromUtc) / (24 * 60 * 60 * 1000)));
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
  const today = businessToday();
  const yesterday = businessYesterday();
  const thisWeekStart = addCalendarDays(today, -6);
  const lastWeekStart = addCalendarDays(today, -13);

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

  const salesPartial = truncated(todayPayments) || truncated(yesterdayBills);
  const billsPartial = truncated(todayBills) || truncated(yesterdayBills);
  const pendingPartial = truncated(unpaidBills) || truncated(partialBills);

  const salesChange = salesPartial ? null : percentChange(todaySales, yesterdaySalesTotal);
  const walkInChange = billsPartial ? null : percentChange(walkInsToday, walkInsYesterday);
  const appointmentChange = percentChange(
    appointmentsToday,
    appointmentsYesterday,
  );
  const avgBillChange = billsPartial ? null : percentChange(avgBillToday, avgBillYesterday);

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
      partial: truncated(todayPayments),
      partialSample: SAMPLE,
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
      partial: truncated(todayBills),
      partialSample: SAMPLE,
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
      partial: truncated(todayBills),
      partialSample: SAMPLE,
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
      partial: pendingPartial,
      partialSample: SAMPLE * 2,
    },
  ];

  // Sales overview from paid bills only. Empty series when API has no activity.
  const thisWeekTotals = new Map<string, number>();
  const lastWeekTotals = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    thisWeekTotals.set(addCalendarDays(today, -(6 - i)), 0);
    lastWeekTotals.set(addCalendarDays(today, -(13 - i)), 0);
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
        const thisKey = addCalendarDays(today, -(6 - i));
        const lastKey = addCalendarDays(today, -(13 - i));
        return {
          dateKey: thisKey,
          label: formatDateOnlyDayLabel(thisKey),
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
      return {
        id: bill.id,
        billNumber: bill.billNumber,
        customerLabel: customerDisplayName(customerMap, bill.customerId),
        amount: toAmount(bill.total),
        paymentMethodLabel: paymentMethodLabel(method),
        paymentMethod: method,
        timeLabel: formatTime(bill.createdAt),
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
      daysPending: daysBetweenDateOnly(bill.billDate, today),
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

  return {
    metrics,
    salesSeries,
    paymentMethods,
    paymentMethodsTotal,
    todayAppointments,
    recentBills,
    pendingCollection,
    topServices,
    chartsPartial: truncated(rangeBills) || truncated(weekPayments),
  };
}
