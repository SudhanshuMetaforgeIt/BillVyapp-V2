import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  IndianRupee,
  Package,
  Receipt,
  Star,
  Store,
  UserRound,
  Users2,
  Wallet,
} from 'lucide-react';

import { businessMonthToDate, businessToday } from '@/lib/business-calendar';
import {
  addCalendarDays,
  calendarDateInTimeZone,
  getBusinessTimezone,
} from '@/lib/business-timezone';
import { formatDate } from '@/lib/format';
import { api } from '@/services/api-client';
import { ROUTES } from '@/constants/routes';
import type { Bill, Customer, Paginated, Payment, Salon } from '@/types/models';
import type {
  AdminBillStatus,
  AdminBranchPerf,
  AdminGlanceMetric,
  AdminQuickAction,
  AdminRecentBill,
  AdminRecentCustomer,
  AdminStat,
  AdminSummaryItem,
  AdminRevenuePoint,
} from '../types/admin-dashboard.types';

export type AdminDashboardData = {
  stats: AdminStat[];
  revenueSeries: AdminRevenuePoint[];
  branchPerformance: AdminBranchPerf[];
  businessSummary: AdminSummaryItem[];
  recentBills: AdminRecentBill[];
  recentCustomers: AdminRecentCustomer[];
  quickActions: AdminQuickAction[];
  glanceMetrics: AdminGlanceMetric[];
  /** All franchise salons for the branch picker (unfiltered). */
  branches: Array<{ id: string; name: string }>;
};

export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  { id: 'add-branch', label: 'Add New Branch', href: ROUTES.dashboard.admin.businesses, icon: Store },
  { id: 'create-bill', label: 'Create Bill', href: ROUTES.dashboard.admin.walkInBilling, icon: Receipt },
  { id: 'add-customer', label: 'Add Customer', href: ROUTES.dashboard.admin.customers, icon: UserRound },
  { id: 'collect-payment', label: 'Collect Payment', href: ROUTES.dashboard.admin.bills, icon: CircleDollarSign },
  { id: 'view-reports', label: 'View Reports', href: ROUTES.dashboard.admin.reports, icon: Receipt },
  {
    id: 'manage-business',
    label: 'Manage Business',
    href: ROUTES.dashboard.admin.businesses,
    icon: Building2,
    primary: true,
  },
];

const SAMPLE = 100;

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isPartial = (p: Paginated<unknown>) => p.meta.total > p.data.length;

/** Daily revenue buckets from start of month through today (zeros included). */
function buildDailyRevenueSeries(
  payments: Payment[],
  dateFrom: string,
  dateTo: string,
): AdminRevenuePoint[] {
  const timeZone = getBusinessTimezone();
  const byDay = new Map<string, number>();
  for (const payment of payments) {
    const dayKey = calendarDateInTimeZone(
      timeZone,
      new Date(payment.paymentDate),
    );
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + num(payment.amount));
  }

  const points: AdminRevenuePoint[] = [];
  let cursor = dateFrom;
  while (cursor <= dateTo) {
    const [y, m, d] = cursor.split('-').map(Number);
    points.push({
      dayKey: cursor,
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(y, m - 1, d, 12))),
      amount: byDay.get(cursor) ?? 0,
    });
    cursor = addCalendarDays(cursor, 1);
  }
  return points;
}

function billStatus(b: Bill): AdminBillStatus {
  if (b.status === 'DRAFT') return 'draft';
  if (b.status === 'CANCELLED') return 'cancelled';
  if (b.status === 'REFUNDED') return 'refunded';
  if (b.paymentStatus === 'PAID') return 'paid';
  if (b.paymentStatus === 'PARTIAL') return 'partial';
  return 'unpaid';
}

export type AdminDashboardParams = {
  salonId?: string;
};

/**
 * Franchise overview composed from existing list endpoints. Counts use
 * `meta.total` and are exact. Money totals are summed from at most SAMPLE
 * rows and labelled partial when the server holds more; an exact figure
 * needs a backend report endpoint.
 *
 * Optional `salonId` scopes bills/customers/etc. to one branch. Payments
 * have no salon filter on the API, so those samples are filtered client-side.
 */
export async function fetchAdminDashboard(
  params: AdminDashboardParams = {},
): Promise<AdminDashboardData> {
  const salonId = params.salonId?.trim() || undefined;
  const scope = salonId ? { salonId } : {};

  const today = businessToday();
  const { dateFrom: monthFrom } = businessMonthToDate();

  const page = <T,>(path: string, query: Record<string, unknown>) =>
    api.get<Paginated<T>>(path, { params: { page: 1, ...query } });
  const total = (path: string, query: Record<string, unknown> = {}) =>
    page<unknown>(path, { ...query, limit: 1 }).then((r) => r.meta.total);

  const [
    allSalons,
    activeSalons,
    customers,
    recentBillsPage,
    activeUsers,
    services,
    monthPayments,
    todayPayments,
    monthBills,
    dueBillsUnpaid,
    dueBillsPartial,
    billsToday,
    appointmentsToday,
    lowStock,
  ] = await Promise.all([
    page<Salon>('/salons', { limit: 100 }),
    total('/salons', { isActive: true }),
    page<Customer>('/customers', { limit: 5, ...scope }),
    page<Bill>('/bills', { limit: 8, ...scope }),
    total('/users', { isActive: true, ...scope }),
    total('/services', { ...scope }),
    page<Payment>('/payments', {
      limit: SAMPLE,
      status: 'SUCCESS',
      dateFrom: monthFrom,
      dateTo: today,
    }),
    page<Payment>('/payments', {
      limit: SAMPLE,
      status: 'SUCCESS',
      dateFrom: today,
      dateTo: today,
    }),
    page<Bill>('/bills', {
      limit: SAMPLE,
      status: 'COMPLETED',
      dateFrom: monthFrom,
      dateTo: today,
      ...scope,
    }),
    page<Bill>('/bills', {
      limit: SAMPLE,
      status: 'COMPLETED',
      paymentStatus: 'UNPAID',
      ...scope,
    }),
    page<Bill>('/bills', {
      limit: SAMPLE,
      status: 'COMPLETED',
      paymentStatus: 'PARTIAL',
      ...scope,
    }),
    total('/bills', { dateFrom: today, dateTo: today, ...scope }),
    total('/appointments', { dateFrom: today, dateTo: today, ...scope }),
    total('/inventory', { lowStock: true, ...scope }),
  ]);

  const filterPayments = (p: Paginated<Payment>): Paginated<Payment> => {
    if (!salonId) return p;
    const data = p.data.filter((row) => row.salonId === salonId);
    return {
      data,
      meta: {
        ...p.meta,
        total: data.length,
        totalPages: data.length === 0 ? 0 : 1,
      },
    };
  };

  const monthPaymentsScoped = filterPayments(monthPayments);
  const todayPaymentsScoped = filterPayments(todayPayments);

  const sumPayments = (p: Paginated<Payment>) =>
    p.data.reduce((s, r) => s + num(r.amount), 0);
  const monthRevenue = sumPayments(monthPaymentsScoped);
  const todaySales = sumPayments(todayPaymentsScoped);
  const dueRows = [...dueBillsUnpaid.data, ...dueBillsPartial.data];
  const pendingCollection = dueRows.reduce((s, b) => s + num(b.dueAmount), 0);
  const pendingPartial = isPartial(dueBillsUnpaid) || isPartial(dueBillsPartial);

  const partialLabel = (sample: number) => `partial — latest ${sample} records`;

  const branchList = salonId
    ? allSalons.data.filter((s) => s.id === salonId)
    : allSalons.data;

  const branchCount = salonId ? branchList.length : allSalons.meta.total;
  const activeBranchCount = salonId
    ? branchList.filter((s) => s.isActive).length
    : activeSalons;

  const stats: AdminStat[] = [
    {
      id: 'total-branches',
      label: salonId ? 'Selected Branch' : 'Total Branches',
      rawValue: branchCount,
      displayValue: salonId
        ? branchList[0]?.name ?? '—'
        : branchCount.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: salonId
        ? 'filtered view'
        : `${activeBranchCount.toLocaleString('en-IN')} active`,
      icon: Store,
      iconTone: 'emerald',
    },
    {
      id: 'total-customers',
      label: 'Total Customers',
      rawValue: customers.meta.total,
      displayValue: customers.meta.total.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: 'registered customers',
      icon: UserRound,
      iconTone: 'champagne',
    },
    {
      id: 'revenue-month',
      label: 'Collected This Month',
      rawValue: monthRevenue,
      displayValue: inr(monthRevenue),
      changePercent: null,
      comparisonLabel: isPartial(monthPaymentsScoped)
        ? partialLabel(SAMPLE)
        : 'successful payments',
      icon: IndianRupee,
      iconTone: 'orange',
    },
    {
      id: 'total-bills',
      label: 'Total Bills',
      rawValue: recentBillsPage.meta.total,
      displayValue: recentBillsPage.meta.total.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: 'all time',
      icon: Receipt,
      iconTone: 'info',
    },
    {
      id: 'active-staff',
      label: 'Active Users',
      rawValue: activeUsers,
      displayValue: activeUsers.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: 'staff accounts in scope',
      icon: Users2,
      iconTone: 'danger',
    },
  ];

  const branchRevenue = new Map<string, number>();
  for (const b of monthBills.data) {
    branchRevenue.set(b.salonId, (branchRevenue.get(b.salonId) ?? 0) + num(b.total));
  }
  const topRevenue = Math.max(0, ...branchRevenue.values());
  const branchPerformance: AdminBranchPerf[] = branchList.map((salon) => {
    const revenue = branchRevenue.get(salon.id) ?? 0;
    return {
      id: salon.id,
      name: salon.name,
      revenue,
      percent: topRevenue > 0 ? Math.round((revenue / topRevenue) * 100) : 0,
    };
  });

  const businessSummary: AdminSummaryItem[] = [
    {
      id: 'active-branches',
      label: salonId ? 'Branch Status' : 'Active Branches',
      value: salonId
        ? branchList[0]?.isActive
          ? 'Active'
          : 'Inactive'
        : activeBranchCount.toLocaleString('en-IN'),
      tone: 'emerald',
      icon: BadgeCheck,
    },
    {
      id: 'services',
      label: 'Services',
      value: services.toLocaleString('en-IN'),
      tone: 'champagne',
      icon: Star,
    },
    {
      id: 'pending-collection',
      label: pendingPartial ? 'Pending Collection (partial)' : 'Pending Collection',
      value: inr(pendingCollection),
      tone: 'danger',
      icon: Wallet,
    },
    {
      id: 'low-stock',
      label: 'Low Stock Items',
      value: lowStock.toLocaleString('en-IN'),
      tone: 'neutral',
      icon: Package,
    },
  ];

  const recentBills: AdminRecentBill[] = recentBillsPage.data.map((b) => ({
    id: b.id,
    billNo: b.billNumber,
    customer: b.customer
      ? [b.customer.firstName, b.customer.lastName].filter(Boolean).join(' ') ||
        b.customer.customerCode
      : '—',
    amount: num(b.total),
    status: billStatus(b),
  }));

  const recentCustomers: AdminRecentCustomer[] = customers.data.map((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.customerCode;
    return {
      id: c.id,
      name,
      initials: name.slice(0, 2).toUpperCase(),
      branch: c.branchName ?? '—',
      dateLabel: formatDate(c.createdAt),
    };
  });

  const glanceMetrics: AdminGlanceMetric[] = [
    {
      id: 'today-sales',
      label: isPartial(todayPaymentsScoped)
        ? "Today's Collections (partial)"
        : "Today's Collections",
      displayValue: inr(todaySales),
      icon: IndianRupee,
      iconTone: 'orange',
    },
    {
      id: 'bills-today',
      label: 'Bills Today',
      displayValue: billsToday.toLocaleString('en-IN'),
      icon: Receipt,
      iconTone: 'emerald',
    },
    {
      id: 'appointments',
      label: "Today's Appointments",
      displayValue: appointmentsToday.toLocaleString('en-IN'),
      icon: CalendarDays,
      iconTone: 'champagne',
    },
    {
      id: 'pending-collection',
      label: pendingPartial ? 'Pending Collection (partial)' : 'Pending Collection',
      displayValue: inr(pendingCollection),
      icon: Wallet,
      iconTone: 'danger',
    },
  ];

  const revenueSeries = buildDailyRevenueSeries(
    monthPaymentsScoped.data,
    monthFrom,
    today,
  );

  return {
    stats,
    revenueSeries,
    branchPerformance,
    businessSummary,
    recentBills,
    recentCustomers,
    quickActions: ADMIN_QUICK_ACTIONS,
    glanceMetrics,
    branches: allSalons.data.map((s) => ({ id: s.id, name: s.name })),
  };
}
