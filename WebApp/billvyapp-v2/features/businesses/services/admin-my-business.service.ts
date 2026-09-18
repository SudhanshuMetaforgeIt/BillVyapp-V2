import { format, startOfMonth } from 'date-fns';

import { api } from '@/services/api-client';
import type {
  AdminBranchItem,
  AdminBusinessStats,
  AdminFranchiseOverview,
  AdminMyBusinessData,
  AdminOverviewAllBranches,
} from '../types/admin-my-business.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function fetchAdminMyBusinessData(franchiseId?: string | null): Promise<AdminMyBusinessData> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const dateFrom = format(thisMonthStart, 'yyyy-MM-dd');
  const dateTo = format(now, 'yyyy-MM-dd');

  const [
    salonsRes,
    usersRes,
    customersRes,
    servicesRes,
    billsRes,
    paymentsRes,
    productsRes,
    franchiseRes,
  ] = await Promise.allSettled([
    api.get<PaginatedResponse<{
      id: string;
      name: string;
      code: string;
      city?: string;
      state?: string;
      addressLine1?: string;
      isActive: boolean;
      createdAt: string;
    }>>('/salons', { params: { page: 1, limit: 50 } }),
    api.get<PaginatedResponse<{ id: string; firstName: string; lastName: string; isActive: boolean }>>('/users', {
      params: { page: 1, limit: 50 },
    }),
    api.get<PaginatedResponse<{ id: string }>>('/customers', { params: { page: 1, limit: 1 } }),
    api.get<PaginatedResponse<{ id: string }>>('/services', { params: { page: 1, limit: 1 } }),
    api.get<PaginatedResponse<{ id: string }>>('/bills', {
      params: { page: 1, limit: 1, dateFrom, dateTo },
    }),
    api.get<PaginatedResponse<{ id: string; amount: number | string }>>('/payments', {
      params: { page: 1, limit: 100, dateFrom, dateTo, status: 'SUCCESS' },
    }),
    api.get<PaginatedResponse<{ id: string }>>('/products', { params: { page: 1, limit: 1 } }),
    franchiseId
      ? api.get<{ id: string; name: string; code: string; email?: string; phone?: string; createdAt?: string }>(
          `/franchises/${franchiseId}`,
        )
      : Promise.reject(new Error('No franchiseId')),
  ]);

  const getArray = <T>(res: PromiseSettledResult<unknown>): T[] => {
    if (
      res.status === 'fulfilled' &&
      res.value &&
      typeof res.value === 'object' &&
      'data' in res.value &&
      Array.isArray((res.value as { data: unknown }).data)
    ) {
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

  type RawSalon = {
    id: string;
    name: string;
    code: string;
    city?: string;
    state?: string;
    addressLine1?: string;
    isActive: boolean;
    createdAt: string;
  };

  const salons = getArray<RawSalon>(salonsRes);
  const users = getArray<{ id: string; firstName: string; lastName: string; isActive: boolean }>(usersRes);
  const payments = getArray<{ id: string; amount: number | string }>(paymentsRes);

  const totalBranches = getTotal(salonsRes);
  const activeBranches = salons.filter((s) => s.isActive).length;
  const inactiveBranches = Math.max(totalBranches - activeBranches, 0);
  const totalStaff = getTotal(usersRes);

  const revenueMonth = payments.reduce((sum, p) => {
    const amt = Number(p.amount);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);

  const stats: AdminBusinessStats = {
    totalBranches,
    activeBranches,
    inactiveBranches,
    totalStaff,
    revenueMonth,
  };

  // Franchise Details
  const fData =
    franchiseRes.status === 'fulfilled' && franchiseRes.value && typeof franchiseRes.value === 'object'
      ? (franchiseRes.value as { id: string; name?: string; code?: string; email?: string; phone?: string; createdAt?: string })
      : null;

  const franchise: AdminFranchiseOverview = {
    id: fData?.id ?? franchiseId ?? 'business-1',
    name: fData?.name ?? 'My Business',
    code: fData?.code ?? 'BIZ',
    email: fData?.email ?? null,
    phone: fData?.phone ?? null,
    address: null,
    businessSince: fData?.createdAt ? format(new Date(fData.createdAt), 'MMM dd, yyyy') : 'Recent',
    subscriptionPlan: 'Professional Plan',
    planValidTill: 'Active',
  };

  // Real branches mapped from DB (empty array if none in DB!)
  const branches: AdminBranchItem[] = salons.map((salon, index) => {
    const locParts = [salon.addressLine1, salon.city, salon.state].filter(Boolean);
    const location = locParts.length > 0 ? locParts.join(', ') : 'Location not specified';

    return {
      id: salon.id,
      name: salon.name,
      location,
      code: salon.code || `BR-${salon.id.slice(0, 4).toUpperCase()}`,
      isMain: index === 0,
      managerName: 'Branch Manager',
      managerPhone: '—',
      managerInitials: (salon.name[0] || 'B').toUpperCase(),
      status: salon.isActive ? 'active' : 'inactive',
      staffCount: 0,
      revenueMonth: 0,
    };
  });

  const overview: AdminOverviewAllBranches = {
    totalCustomers: getTotal(customersRes),
    totalServices: getTotal(servicesRes),
    totalBillsMonth: getTotal(billsRes),
    totalProducts: getTotal(productsRes),
    totalCampaigns: 0,
  };

  return {
    stats,
    franchise,
    branches,
    overview,
  };
}
