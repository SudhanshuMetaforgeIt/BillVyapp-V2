import { format, startOfMonth } from 'date-fns';
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

function billStatus(b: Bill): AdminBillStatus {
  if (b.status === 'DRAFT') return 'draft';
  if (b.status === 'CANCELLED') return 'cancelled';
  if (b.status === 'REFUNDED') return 'refunded';
  if (b.paymentStatus === 'PAID') return 'paid';
  if (b.paymentStatus === 'PARTIAL') return 'partial';
  return 'unpaid';
}

/**
 * Franchise overview composed from existing list endpoints. Counts use
 * `meta.total` and are exact. Money totals are summed from at most SAMPLE
 * rows and labelled partial when the server holds more; an exact figure
 * needs a backend report endpoint.
 */
export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const monthFrom = format(startOfMonth(now), 'yyyy-MM-dd');

  const page = <T,>(path: string, params: Record<string, unknown>) =>
    api.get<Paginated<T>>(path, { params: { page: 1, ...params } });
  const total = (path: string, params: Record<string, unknown> = {}) =>
    page<unknown>(path, { ...params, limit: 1 }).then((r) => r.meta.total);

  const [
    salons,
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
    page<Salon>('/salons', { limit: 10 }),
    total('/salons', { isActive: true }),
    page<Customer>('/customers', { limit: 5 }),
    page<Bill>('/bills', { limit: 8 }),
    total('/users', { isActive: true }),
    total('/services'),
    page<Payment>('/payments', { limit: SAMPLE, status: 'SUCCESS', dateFrom: monthFrom, dateTo: today }),
    page<Payment>('/payments', { limit: SAMPLE, status: 'SUCCESS', dateFrom: today, dateTo: today }),
    page<Bill>('/bills', { limit: SAMPLE, status: 'COMPLETED', dateFrom: monthFrom, dateTo: today }),
    page<Bill>('/bills', { limit: SAMPLE, status: 'COMPLETED', paymentStatus: 'UNPAID' }),
    page<Bill>('/bills', { limit: SAMPLE, status: 'COMPLETED', paymentStatus: 'PARTIAL' }),
    total('/bills', { dateFrom: today, dateTo: today }),
    total('/appointments', { dateFrom: today, dateTo: today }),
    total('/inventory', { lowStock: true }),
  ]);

  const sumPayments = (p: Paginated<Payment>) => p.data.reduce((s, r) => s + num(r.amount), 0);
  const monthRevenue = sumPayments(monthPayments);
  const todaySales = sumPayments(todayPayments);
  const dueRows = [...dueBillsUnpaid.data, ...dueBillsPartial.data];
  const pendingCollection = dueRows.reduce((s, b) => s + num(b.dueAmount), 0);
  const pendingPartial = isPartial(dueBillsUnpaid) || isPartial(dueBillsPartial);

  const partialLabel = (sample: number) => `partial — latest ${sample} records`;

  const stats: AdminStat[] = [
    {
      id: 'total-branches',
      label: 'Total Branches',
      rawValue: salons.meta.total,
      displayValue: salons.meta.total.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: `${activeSalons.toLocaleString('en-IN')} active`,
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
      comparisonLabel: isPartial(monthPayments) ? partialLabel(SAMPLE) : 'successful payments',
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
  const branchPerformance: AdminBranchPerf[] = isPartial(monthBills)
    ? []
    : salons.data.map((salon) => {
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
      label: 'Active Branches',
      value: activeSalons.toLocaleString('en-IN'),
      tone: 'emerald',
      icon: BadgeCheck,
    },
    { id: 'services', label: 'Services', value: services.toLocaleString('en-IN'), tone: 'champagne', icon: Star },
    {
      id: 'pending-collection',
      label: pendingPartial ? 'Pending Collection (partial)' : 'Pending Collection',
      value: inr(pendingCollection),
      tone: 'danger',
      icon: Wallet,
    },
    { id: 'low-stock', label: 'Low Stock Items', value: lowStock.toLocaleString('en-IN'), tone: 'neutral', icon: Package },
  ];

  const recentBills: AdminRecentBill[] = recentBillsPage.data.map((b) => ({
    id: b.id,
    billNo: b.billNumber,
    customer: b.customer ? [b.customer.firstName, b.customer.lastName].filter(Boolean).join(' ') || b.customer.customerCode : '—',
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
      dateLabel: format(new Date(c.createdAt), 'dd MMM'),
    };
  });

  const glanceMetrics: AdminGlanceMetric[] = [
    {
      id: 'today-sales',
      label: isPartial(todayPayments) ? "Today's Collections (partial)" : "Today's Collections",
      displayValue: inr(todaySales),
      icon: IndianRupee,
      iconTone: 'orange',
    },
    { id: 'bills-today', label: 'Bills Today', displayValue: billsToday.toLocaleString('en-IN'), icon: Receipt, iconTone: 'emerald' },
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

  return {
    stats,
    revenueSeries: [],
    branchPerformance,
    businessSummary,
    recentBills,
    recentCustomers,
    quickActions: ADMIN_QUICK_ACTIONS,
    glanceMetrics,
  };
}
