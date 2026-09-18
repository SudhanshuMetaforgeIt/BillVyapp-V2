import { format, startOfMonth, subDays, subMonths } from 'date-fns';

import { api } from '@/services/api-client';
import type { RevenuePoint } from '../data/placeholders';
import type {
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
