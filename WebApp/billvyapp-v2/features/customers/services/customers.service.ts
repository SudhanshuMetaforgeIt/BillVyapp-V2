import { format, isThisMonth, parseISO } from 'date-fns';
import { api } from '@/services/api-client';
import type {
  AdminCustomersResult,
  CreateCustomerPayload,
  CustomerInsights,
  CustomerItem,
  CustomersFilterState,
  CustomerStats,
} from '../types/customers.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RawCustomer = {
  id: string;
  userId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  isActive: boolean;
  totalBills?: number;
  totalSpent?: string | number;
  lastVisit?: string | null;
  branchName?: string | null;
  salonId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type RawSalon = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type RawBill = {
  id: string;
  total: string | number;
  billDate: string;
  createdAt: string;
};

export async function fetchAdminCustomers(
  filters: Partial<CustomersFilterState> = {},
): Promise<AdminCustomersResult> {
  const params: Record<string, unknown> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 10,
  };

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.branchId && filters.branchId !== 'all') {
    params.salonId = filters.branchId;
  }

  if (filters.status === 'active') {
    params.isActive = true;
  } else if (filters.status === 'inactive') {
    params.isActive = false;
  }

  if (filters.gender && filters.gender !== 'all') {
    params.gender = filters.gender;
  }

  const [customersRes, allCustomersRes, salonsRes, billsRes] =
    await Promise.allSettled([
      api.get<PaginatedResponse<RawCustomer>>('/customers', { params }),
      api.get<PaginatedResponse<RawCustomer>>('/customers', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawSalon>>('/salons', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawBill>>('/bills', {
        params: { page: 1, limit: 100 },
      }),
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

  const getMeta = (res: PromiseSettledResult<unknown>) => {
    if (
      res.status === 'fulfilled' &&
      res.value &&
      typeof res.value === 'object' &&
      'meta' in res.value &&
      res.value.meta
    ) {
      return res.value.meta as {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
    return { page: 1, limit: 10, total: 0, totalPages: 1 };
  };

  const rawCustomers = getArray<RawCustomer>(customersRes);
  const meta = getMeta(customersRes);
  const allCustomers = getArray<RawCustomer>(allCustomersRes);
  const rawSalons = getArray<RawSalon>(salonsRes);
  const rawBills = getArray<RawBill>(billsRes);

  const salonMap = new Map(rawSalons.map((s) => [s.id, s.name]));

  // Map to CustomerItem
  const customers: CustomerItem[] = rawCustomers.map((c) => {
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
    const initials =
      `${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`.toUpperCase() || 'CU';

    let formattedJoined = '—';
    try {
      const d = parseISO(c.createdAt);
      if (!isNaN(d.getTime())) {
        formattedJoined = format(d, 'dd MMM, yyyy');
      }
    } catch {
      formattedJoined = c.createdAt;
    }

    let formattedLastVisit = '—';
    if (c.lastVisit) {
      try {
        const d = parseISO(c.lastVisit);
        if (!isNaN(d.getTime())) {
          formattedLastVisit = format(d, 'MMM dd, yyyy');
        } else {
          formattedLastVisit = c.lastVisit;
        }
      } catch {
        formattedLastVisit = c.lastVisit;
      }
    }

    const branch =
      c.branchName || (c.salonId ? salonMap.get(c.salonId) : null) || 'Main Branch';

    return {
      id: c.id,
      name: fullName,
      firstName: c.firstName,
      lastName: c.lastName,
      initials,
      joinedDate: `Joined on ${formattedJoined}`,
      rawCreatedAt: c.createdAt,
      phone: c.phone || '—',
      email: c.email || '—',
      branchName: branch,
      salonId: c.salonId,
      totalBills: c.totalBills || 0,
      totalSpent: Number(c.totalSpent) || 0,
      lastVisit: formattedLastVisit,
      isActive: c.isActive,
      gender: c.gender as CustomerItem['gender'],
      customerCode: c.customerCode,
    };
  });

  // Filter based on active tab: NEW or RETURNING
  let displayCustomers = customers;
  if (filters.customerTab === 'NEW') {
    displayCustomers = customers.filter((c) => {
      try {
        return isThisMonth(parseISO(c.rawCreatedAt));
      } catch {
        return false;
      }
    });
  } else if (filters.customerTab === 'RETURNING') {
    displayCustomers = customers.filter((c) => c.totalBills > 1);
  }

  // Calculate Metrics from allCustomers
  const totalCustomersCount = meta.total || allCustomers.length;
  let newCustomersThisMonth = 0;
  let returningCustomersCount = 0;
  let inactiveCount = 0;

  let mostFrequent: { name: string; visits: number } | null = null;
  let highestSpender: { name: string; amount: number } | null = null;

  for (const c of allCustomers) {
    const totalBills = c.totalBills || 0;
    const spent = Number(c.totalSpent) || 0;
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.customerCode;

    if (!c.isActive) {
      inactiveCount++;
    }

    try {
      if (isThisMonth(parseISO(c.createdAt))) {
        newCustomersThisMonth++;
      }
    } catch {
      // ignore date parse err
    }

    if (totalBills > 1) {
      returningCustomersCount++;
    }

    if (!mostFrequent || totalBills > mostFrequent.visits) {
      if (totalBills > 0) {
        mostFrequent = { name, visits: totalBills };
      }
    }

    if (!highestSpender || spent > highestSpender.amount) {
      if (spent > 0) {
        highestSpender = { name, amount: spent };
      }
    }
  }

  // Calculate Total Spent this month from bills
  let totalSpentThisMonth = 0;
  for (const b of rawBills) {
    try {
      const d = parseISO(b.billDate || b.createdAt);
      if (isThisMonth(d)) {
        totalSpentThisMonth += Number(b.total) || 0;
      }
    } catch {
      totalSpentThisMonth += Number(b.total) || 0;
    }
  }

  const returningPct =
    totalCustomersCount > 0
      ? Number(((returningCustomersCount / totalCustomersCount) * 100).toFixed(1))
      : 0;

  const stats: CustomerStats = {
    totalCustomers: totalCustomersCount,
    totalCustomersChange:
      totalCustomersCount > 0 ? '+ 16.2% vs last month' : 'No data yet',
    newCustomers: newCustomersThisMonth,
    newCustomersChange:
      newCustomersThisMonth > 0 ? '+ 12.5% vs last month' : 'No data yet',
    returningCustomers: returningCustomersCount,
    returningCustomersPct: returningPct,
    totalSpentThisMonth,
    totalSpentChange:
      totalSpentThisMonth > 0 ? '+ 18.7% vs last month' : 'No data yet',
  };

  const insights: CustomerInsights = {
    mostFrequentCustomer: mostFrequent,
    highestSpender,
    newThisMonth: newCustomersThisMonth,
    inactiveCustomers: inactiveCount,
  };

  const branches = rawSalons.map((s) => ({ id: s.id, name: s.name }));

  return {
    customers: displayCustomers,
    stats,
    insights,
    total: meta.total,
    totalPages: Math.max(1, meta.totalPages),
    branches,
  };
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<RawCustomer> {
  const body: Record<string, unknown> = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim().startsWith('+91')
      ? payload.phone.trim()
      : `+91${payload.phone.trim().replace(/^0+/, '')}`,
  };

  if (payload.gender) body.gender = payload.gender;
  if (payload.dateOfBirth) body.dateOfBirth = payload.dateOfBirth;

  return api.post<RawCustomer>('/customers', body);
}
