import { format, startOfMonth } from 'date-fns';
import {
  BadgeCheck,
  Building2,
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
import type {
  AdminBranchPerf,
  AdminGlanceMetric,
  AdminQuickAction,
  AdminRecentBill,
  AdminRecentCustomer,
  AdminStat,
  AdminSummaryItem,
  AdminRevenuePoint,
} from '../types/admin-dashboard.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

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
  {
    id: 'add-branch',
    label: 'Add New Branch',
    href: ROUTES.dashboard.admin.businesses,
    icon: Store,
  },
  {
    id: 'create-bill',
    label: 'Create Bill',
    href: ROUTES.dashboard.admin.bills,
    icon: Receipt,
  },
  {
    id: 'add-customer',
    label: 'Add Customer',
    href: ROUTES.dashboard.admin.customers,
    icon: UserRound,
  },
  {
    id: 'collect-payment',
    label: 'Collect Payment',
    href: ROUTES.dashboard.admin.bills,
    icon: CircleDollarSign,
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    href: ROUTES.dashboard.admin.reports,
    icon: Receipt,
  },
  {
    id: 'manage-business',
    label: 'Manage Business',
    href: ROUTES.dashboard.admin.businesses,
    icon: Building2,
    primary: true,
  },
];

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const dateFrom = format(thisMonthStart, 'yyyy-MM-dd');
  const dateTo = format(now, 'yyyy-MM-dd');

  // Fetch real data from all relevant backend endpoints concurrently
  const [
    salonsRes,
    customersRes,
    billsRes,
    usersRes,
    paymentsRes,
    servicesRes,
    appointmentsRes,
  ] = await Promise.allSettled([
    api.get<PaginatedResponse<{ id: string; name: string; isActive: boolean }>>('/salons', {
      params: { page: 1, limit: 10 },
    }),
    api.get<PaginatedResponse<{ id: string; firstName: string; lastName: string; phone?: string; createdAt: string }>>('/customers', {
      params: { page: 1, limit: 10 },
    }),
    api.get<PaginatedResponse<{ id: string; billNumber?: string; finalAmount?: number; totalAmount?: number; status: string; createdAt: string; customer?: { firstName?: string; lastName?: string } }>>('/bills', {
      params: { page: 1, limit: 10 },
    }),
    api.get<PaginatedResponse<{ id: string; firstName: string; lastName: string; isActive: boolean }>>('/users', {
      params: { page: 1, limit: 10 },
    }),
    api.get<PaginatedResponse<{ id: string; amount: number | string; status: string; createdAt: string }>>('/payments', {
      params: { page: 1, limit: 100, dateFrom, dateTo, status: 'SUCCESS' },
    }),
    api.get<PaginatedResponse<{ id: string }>>('/services', {
      params: { page: 1, limit: 1 },
    }),
    api.get<PaginatedResponse<{ id: string }>>('/appointments', {
      params: { page: 1, limit: 10 },
    }),
  ]);

  const getArray = <T>(res: PromiseSettledResult<unknown>): T[] => {
    if (res.status === 'fulfilled' && res.value && typeof res.value === 'object' && 'data' in res.value && Array.isArray((res.value as { data: unknown }).data)) {
      return (res.value as { data: T[] }).data;
    }
    return [];
  };

  const getTotal = (res: PromiseSettledResult<unknown>): number => {
    if (
      res.status === 'fulfilled' &&
      res.value &&
      typeof res.value === 'object' &&
      'meta' in res.value &&
      res.value.meta &&
      typeof (res.value.meta as { total?: unknown }).total === 'number'
    ) {
      return (res.value.meta as { total: number }).total;
    }
    return 0;
  };

  type SalonItem = { id: string; name: string; isActive: boolean };
  type CustomerItem = { id: string; firstName?: string; lastName?: string; phone?: string; createdAt?: string };
  type BillItem = { id: string; billNumber?: string; finalAmount?: number; totalAmount?: number; status?: string; createdAt?: string; customer?: { firstName?: string; lastName?: string } };
  type UserItem = { id: string; firstName?: string; lastName?: string; isActive?: boolean };
  type PaymentItem = { id: string; amount: number | string; status?: string; createdAt?: string };

  const salonsList = getArray<SalonItem>(salonsRes);
  const customersList = getArray<CustomerItem>(customersRes);
  const billsList = getArray<BillItem>(billsRes);
  const usersList = getArray<UserItem>(usersRes);
  const paymentsList = getArray<PaymentItem>(paymentsRes);

  const totalBranches = getTotal(salonsRes);
  const activeBranches = salonsList.filter((s) => s.isActive).length;
  const totalCustomers = getTotal(customersRes);
  const totalBills = getTotal(billsRes);
  const activeStaff = getTotal(usersRes);
  const totalServices = getTotal(servicesRes);
  const totalAppointments = getTotal(appointmentsRes);

  const thisMonthRevenue = paymentsList.reduce((sum, p) => {
    const amt = Number(p.amount);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);

  // 1. Stats row
  const stats: AdminStat[] = [
    {
      id: 'total-businesses',
      label: 'Total Businesses',
      rawValue: 1,
      displayValue: '1',
      changePercent: null,
      comparisonLabel: 'registered franchise',
      icon: Building2,
      iconTone: 'orange',
    },
    {
      id: 'total-branches',
      label: 'Total Branches',
      rawValue: totalBranches,
      displayValue: totalBranches.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: totalBranches === 0 ? 'no branches added yet' : 'active franchise branches',
      icon: Store,
      iconTone: 'emerald',
    },
    {
      id: 'total-customers',
      label: 'Total Customers',
      rawValue: totalCustomers,
      displayValue: totalCustomers.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: totalCustomers === 0 ? 'no customers yet' : 'registered customers',
      icon: UserRound,
      iconTone: 'champagne',
    },
    {
      id: 'revenue-month',
      label: 'Revenue This Month',
      rawValue: thisMonthRevenue,
      displayValue: `₹${thisMonthRevenue.toLocaleString('en-IN')}`,
      changePercent: null,
      comparisonLabel: thisMonthRevenue === 0 ? 'no transactions yet' : 'current month revenue',
      icon: IndianRupee,
      iconTone: 'orange',
    },
    {
      id: 'total-bills',
      label: 'Total Bills',
      rawValue: totalBills,
      displayValue: totalBills.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: totalBills === 0 ? 'no bills generated' : 'total bills raised',
      icon: Receipt,
      iconTone: 'info',
    },
    {
      id: 'active-staff',
      label: 'Active Staff',
      rawValue: activeStaff,
      displayValue: activeStaff.toLocaleString('en-IN'),
      changePercent: null,
      comparisonLabel: activeStaff === 0 ? 'no staff assigned' : 'platform members',
      icon: Users2,
      iconTone: 'danger',
    },
  ];

  // 2. Branch Performance (empty if no branches or no per-branch revenue)
  const branchPerformance: AdminBranchPerf[] = salonsList.map((salon) => ({
    id: salon.id,
    name: salon.name,
    revenue: 0,
    percent: 0,
  }));

  // 3. Business Summary items
  const businessSummary: AdminSummaryItem[] = [
    {
      id: 'businesses',
      label: 'Businesses',
      value: '1',
      tone: 'orange',
      icon: Building2,
    },
    {
      id: 'active-branches',
      label: 'Active Branches',
      value: activeBranches.toLocaleString('en-IN'),
      tone: 'emerald',
      icon: BadgeCheck,
    },
    {
      id: 'services',
      label: 'Services',
      value: totalServices.toLocaleString('en-IN'),
      tone: 'champagne',
      icon: Star,
    },
    {
      id: 'pending-collection',
      label: 'Pending Collection',
      value: '₹0',
      tone: 'danger',
      icon: Wallet,
    },
    {
      id: 'low-stock',
      label: 'Low Stock Items',
      value: '0',
      tone: 'neutral',
      icon: Package,
    },
  ];

  // 4. Recent Bills (empty array if none in DB)
  const recentBills: AdminRecentBill[] = billsList.map((b) => {
    const customerName = b.customer
      ? `${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() || 'Walk-in Customer'
      : 'Walk-in Customer';
    const amount = Number(b.finalAmount ?? b.totalAmount ?? 0);
    const status = b.status?.toLowerCase() === 'paid' ? 'paid' : b.status?.toLowerCase() === 'pending' ? 'pending' : 'failed';

    return {
      id: b.id,
      billNo: b.billNumber ?? `BILL-${b.id.slice(0, 6).toUpperCase()}`,
      customer: customerName,
      amount,
      status,
    };
  });

  // 5. Recent Customers (empty array if none in DB)
  const recentCustomers: AdminRecentCustomer[] = customersList.map((c) => {
    const fullName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Customer';
    const initials =
      `${(c.firstName ?? 'C')[0]}${(c.lastName ?? '')[0] || ''}`.toUpperCase();

    return {
      id: c.id,
      name: fullName,
      initials,
      branch: 'Main Branch',
      dateLabel: c.createdAt ? format(new Date(c.createdAt), 'dd MMM') : 'Recent',
    };
  });

  // 6. At a Glance Metrics
  const glanceMetrics: AdminGlanceMetric[] = [
    {
      id: 'today-sales',
      label: "Today's Sales",
      displayValue: '₹0',
      icon: IndianRupee,
      iconTone: 'orange',
    },
    {
      id: 'walkins',
      label: "Today's Walk-ins",
      displayValue: '0',
      icon: UserRound,
      iconTone: 'emerald',
    },
    {
      id: 'appointments',
      label: 'Appointments',
      displayValue: totalAppointments.toLocaleString('en-IN'),
      icon: Star,
      iconTone: 'champagne',
    },
    {
      id: 'bills-generated',
      label: 'Bills Generated',
      displayValue: totalBills.toLocaleString('en-IN'),
      icon: Receipt,
      iconTone: 'info',
    },
    {
      id: 'pending-collection',
      label: 'Pending Collection',
      displayValue: '₹0',
      icon: Wallet,
      iconTone: 'danger',
    },
  ];

  return {
    stats,
    revenueSeries: [] as AdminRevenuePoint[], // Empty by default when no transactions exist
    branchPerformance,
    businessSummary,
    recentBills,
    recentCustomers,
    quickActions: ADMIN_QUICK_ACTIONS,
    glanceMetrics,
  };
}
