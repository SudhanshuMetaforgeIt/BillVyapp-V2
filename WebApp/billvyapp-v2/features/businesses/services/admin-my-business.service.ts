import { format, startOfMonth } from 'date-fns';

import { api } from '@/services/api-client';
import type { Bill, Franchise, Paginated, Payment, Salon } from '@/types/models';
import type {
  AdminBranchItem,
  AdminBusinessStats,
  AdminFranchiseOverview,
  AdminMyBusinessData,
  AdminOverviewAllBranches,
} from '../types/admin-my-business.types';

const SAMPLE = 100;

type User = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  salonId: string | null;
  role: { code: string } | null;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isPartial = (p: Paginated<unknown>) => p.meta.total > p.data.length;

export async function fetchAdminMyBusinessData(franchiseId?: string | null): Promise<AdminMyBusinessData> {
  const now = new Date();
  const dateFrom = format(startOfMonth(now), 'yyyy-MM-dd');
  const dateTo = format(now, 'yyyy-MM-dd');

  const page = <T,>(path: string, params: Record<string, unknown>) =>
    api.get<Paginated<T>>(path, { params: { page: 1, ...params } });
  const total = (path: string, params: Record<string, unknown> = {}) =>
    page<unknown>(path, { ...params, limit: 1 }).then((r) => r.meta.total);

  const [salons, activeSalons, users, customers, services, billsMonthCount, monthBills, payments, products, franchiseData] =
    await Promise.all([
      page<Salon>('/salons', { limit: 50 }),
      total('/salons', { isActive: true }),
      page<User>('/users', { limit: SAMPLE }),
      total('/customers'),
      total('/services'),
      total('/bills', { dateFrom, dateTo }),
      page<Bill>('/bills', { limit: SAMPLE, status: 'COMPLETED', dateFrom, dateTo }),
      page<Payment>('/payments', { limit: SAMPLE, dateFrom, dateTo, status: 'SUCCESS' }),
      total('/products'),
      franchiseId ? api.get<Franchise>(`/franchises/${franchiseId}`) : Promise.resolve(null),
    ]);

  const stats: AdminBusinessStats = {
    totalBranches: salons.meta.total,
    activeBranches: activeSalons,
    inactiveBranches: Math.max(salons.meta.total - activeSalons, 0),
    totalStaff: users.meta.total,
    revenueMonth: payments.data.reduce((sum, p) => sum + num(p.amount), 0),
    revenueMonthPartial: isPartial(payments),
  };

  const franchise: AdminFranchiseOverview = {
    id: franchiseData?.id ?? franchiseId ?? '',
    name: franchiseData?.name ?? '—',
    code: franchiseData?.code ?? '—',
    email: franchiseData?.email ?? null,
    phone: franchiseData?.phone ?? null,
    address: null,
    businessSince: franchiseData ? format(new Date(franchiseData.createdAt), 'MMM dd, yyyy') : '—',
    isActive: franchiseData?.isActive ?? true,
  };

  const usersComplete = !isPartial(users);
  const staffBySalon = new Map<string, User[]>();
  for (const u of users.data) {
    if (!u.salonId) continue;
    staffBySalon.set(u.salonId, [...(staffBySalon.get(u.salonId) ?? []), u]);
  }

  const billsComplete = !isPartial(monthBills);
  const revenueBySalon = new Map<string, number>();
  for (const b of monthBills.data) {
    revenueBySalon.set(b.salonId, (revenueBySalon.get(b.salonId) ?? 0) + num(b.total));
  }

  const branches: AdminBranchItem[] = salons.data.map((salon) => {
    const location = [salon.addressLine1, salon.city, salon.state].filter(Boolean).join(', ') || '—';
    const staff = staffBySalon.get(salon.id) ?? [];
    const manager = usersComplete ? staff.find((u) => u.role?.code === 'MANAGER') : undefined;
    const managerName = manager ? [manager.firstName, manager.lastName].filter(Boolean).join(' ') : null;

    return {
      id: salon.id,
      name: salon.name,
      location,
      code: salon.code,
      managerName,
      managerPhone: manager?.phone ?? null,
      managerInitials: managerName ? managerName.slice(0, 2).toUpperCase() : '—',
      status: salon.isActive ? 'active' : 'inactive',
      staffCount: usersComplete ? staff.length : null,
      revenueMonth: billsComplete ? (revenueBySalon.get(salon.id) ?? 0) : null,
    };
  });

  const overview: AdminOverviewAllBranches = {
    totalCustomers: customers,
    totalServices: services,
    totalBillsMonth: billsMonthCount,
    totalProducts: products,
  };

  return { stats, franchise, branches, overview };
}
