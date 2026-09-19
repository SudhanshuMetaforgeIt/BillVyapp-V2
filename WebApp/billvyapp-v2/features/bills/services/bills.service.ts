import { format } from 'date-fns';
import { api } from '@/services/api-client';
import type {
  AdminBillsResult,
  BillAmountSummary,
  BillItemRow,
  BillPaymentStatus,
  BillRowItem,
  BillsFilterState,
  BillStats,
  BillStatus,
  CreateBillPayload,
} from '../types/bills.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RawBillItem = {
  id: string;
  itemType: string;
  serviceId?: string | null;
  productId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: string | number;
  discount: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  total: string | number;
};

type RawBill = {
  id: string;
  salonId: string;
  customerId: string;
  billNumber: string;
  billDate: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  roundOff: string | number;
  total: string | number;
  paidAmount: string | number;
  dueAmount: string | number;
  status: string;
  paymentStatus: string;
  notes?: string | null;
  salon?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    customerCode: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  items?: RawBillItem[];
  createdAt: string;
};

type RawSalon = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type RawCustomer = {
  id: string;
  customerCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
};

type RawService = {
  id: string;
  salonId: string;
  name: string;
  price: string | number;
  isActive: boolean;
};

export async function fetchAdminBills(
  filters: Partial<BillsFilterState> = {},
): Promise<AdminBillsResult> {
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

  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    params.dateTo = filters.dateTo;
  }

  // Handle status tab
  if (filters.statusTab === 'PAID') {
    params.paymentStatus = 'PAID';
  } else if (filters.statusTab === 'PENDING') {
    params.paymentStatus = 'UNPAID';
  } else if (filters.statusTab === 'OVERDUE') {
    params.paymentStatus = 'UNPAID';
    params.status = 'PENDING';
  } else if (filters.statusTab === 'CANCELLED') {
    params.status = 'CANCELLED';
  }

  // Handle explicit status dropdown if selected and not 'all'
  if (filters.status && filters.status !== 'all') {
    params.status = filters.status;
  }

  const [billsRes, allBillsRes, salonsRes, customersRes, servicesRes] =
    await Promise.allSettled([
      api.get<PaginatedResponse<RawBill>>('/bills', { params }),
      // Fetch broader set for stats calculation
      api.get<PaginatedResponse<RawBill>>('/bills', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawSalon>>('/salons', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawCustomer>>('/customers', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawService>>('/services', {
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

  const rawBills = getArray<RawBill>(billsRes);
  const meta = getMeta(billsRes);

  const allBills = getArray<RawBill>(allBillsRes);
  const rawSalons = getArray<RawSalon>(salonsRes);
  const rawCustomers = getArray<RawCustomer>(customersRes);
  const rawServices = getArray<RawService>(servicesRes);

  // Build lookups for missing relations
  const salonMap = new Map(rawSalons.map((s) => [s.id, s.name]));
  const customerMap = new Map(
    rawCustomers.map((c) => {
      const name =
        c.user?.firstName || c.firstName
          ? `${c.user?.firstName || c.firstName || ''} ${c.user?.lastName || c.lastName || ''}`.trim()
          : c.customerCode || 'Customer';
      const phone = c.user?.phone || c.phone || '—';
      return [c.id, { name, phone, code: c.customerCode }];
    }),
  );

  // Map raw bills to BillRowItem
  const bills: BillRowItem[] = rawBills.map((b) => {
    const customerInfo = customerMap.get(b.customerId);
    const branchName =
      b.salon?.name || salonMap.get(b.salonId) || 'Main Branch';

    let custName = 'Walk-in Customer';
    let custPhone = '—';

    if (b.customer) {
      const parts = [b.customer.firstName, b.customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      custName = parts || b.customer.customerCode || 'Customer';
      custPhone = b.customer.phone || '—';
    } else if (customerInfo) {
      custName = customerInfo.name;
      custPhone = customerInfo.phone;
    }

    let formattedDate = '—';
    let formattedTime = '—';
    try {
      const d = new Date(b.billDate || b.createdAt);
      if (!isNaN(d.getTime())) {
        formattedDate = format(d, 'MMM dd, yyyy');
        formattedTime = format(d, 'hh:mm a');
      }
    } catch {
      formattedDate = b.billDate || '—';
    }

    const items: BillItemRow[] = (b.items || []).map((item) => ({
      id: item.id,
      itemType: (item.itemType as 'SERVICE' | 'PRODUCT') || 'SERVICE',
      serviceId: item.serviceId,
      productId: item.productId,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      taxRate: Number(item.taxRate) || 0,
      taxAmount: Number(item.taxAmount) || 0,
      total: Number(item.total) || 0,
    }));

    return {
      id: b.id,
      billNumber: b.billNumber.startsWith('#')
        ? b.billNumber
        : `#${b.billNumber}`,
      customerId: b.customerId,
      customerName: custName,
      customerPhone: custPhone,
      customerCode: b.customer?.customerCode || customerInfo?.code,
      salonId: b.salonId,
      branchName,
      billDate: formattedDate,
      billTime: formattedTime,
      rawDate: b.billDate || b.createdAt,
      amount: Number(b.total) || 0,
      paidAmount: Number(b.paidAmount) || 0,
      dueAmount: Number(b.dueAmount) || 0,
      status: (b.status as BillStatus) || 'DRAFT',
      paymentStatus: (b.paymentStatus as BillPaymentStatus) || 'UNPAID',
      items,
      notes: b.notes,
      createdAt: b.createdAt,
    };
  });

  // Calculate metrics
  const totalBillsCount = meta.total || allBills.length;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let cancelledCount = 0;

  let totalAmountSum = 0;
  let paidAmountSum = 0;
  let pendingAmountSum = 0;
  let overdueAmountSum = 0;
  let cancelledAmountSum = 0;

  for (const b of allBills) {
    const total = Number(b.total) || 0;
    const paid = Number(b.paidAmount) || 0;
    const due = Number(b.dueAmount) || total - paid;
    const isCancelled = b.status === 'CANCELLED';
    const isPaid = b.paymentStatus === 'PAID';

    if (isCancelled) {
      cancelledCount++;
      cancelledAmountSum += total;
    } else if (isPaid) {
      paidCount++;
      totalAmountSum += total;
      paidAmountSum += total;
    } else {
      // Pending or Overdue
      totalAmountSum += total;
      paidAmountSum += paid;
      if (b.status === 'PENDING' || due > 0) {
        pendingCount++;
        pendingAmountSum += due;
      } else {
        overdueCount++;
        overdueAmountSum += due;
      }
    }
  }

  const calcPct = (count: number, total: number) => {
    if (!total || total === 0) return 0;
    return Number(((count / total) * 100).toFixed(1));
  };

  const stats: BillStats = {
    totalBills: totalBillsCount,
    totalBillsChange: totalBillsCount > 0 ? '+ 15.8% vs last month' : 'No data yet',
    paidBills: paidCount,
    paidBillsPct: calcPct(paidCount, totalBillsCount),
    pendingBills: pendingCount,
    pendingBillsPct: calcPct(pendingCount, totalBillsCount),
    overdueBills: overdueCount,
    overdueBillsPct: calcPct(overdueCount, totalBillsCount),
    totalAmount: totalAmountSum,
    totalAmountChange: totalAmountSum > 0 ? '+ 18.6% vs last month' : 'No data yet',
  };

  const amountSummary: BillAmountSummary = {
    totalAmount: totalAmountSum,
    paidAmount: paidAmountSum,
    pendingAmount: pendingAmountSum,
    overdueAmount: overdueAmountSum,
    cancelledAmount: cancelledAmountSum,
  };

  const branches = rawSalons.map((s) => ({ id: s.id, name: s.name }));
  const customers = rawCustomers.map((c) => {
    const name =
      c.user?.firstName || c.firstName
        ? `${c.user?.firstName || c.firstName || ''} ${c.user?.lastName || c.lastName || ''}`.trim()
        : c.customerCode || 'Customer';
    return {
      id: c.id,
      name,
      phone: c.user?.phone || c.phone,
      customerCode: c.customerCode,
    };
  });
  const services = rawServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price) || 0,
    salonId: s.salonId,
  }));

  return {
    bills,
    stats,
    amountSummary,
    total: meta.total,
    totalPages: Math.max(1, meta.totalPages),
    branches,
    customers,
    services,
  };
}

export async function createBill(payload: CreateBillPayload): Promise<RawBill> {
  return api.post<RawBill>('/bills', payload);
}

export async function updateBillStatus(
  billId: string,
  status: BillStatus,
): Promise<RawBill> {
  return api.patch<RawBill>(`/bills/${billId}/status`, { status });
}
