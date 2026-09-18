import { format, startOfMonth } from 'date-fns';

import { api } from '@/services/api-client';
import { formatFullName } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  FranchiseListItem,
  PaginatedResponse,
} from '@/features/dashboard/types/dashboard.types';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../data/placeholders';
import type {
  FranchiseOption,
  PaymentApiItem,
  PaymentListRow,
  PaymentMethod,
  PaymentsListParams,
  PaymentsPageData,
  PaymentStatus,
  PaymentSummarySlice,
} from '../types/payments.types';

type SalonLookup = {
  id: string;
  name: string;
  franchiseId: string;
};

type CustomerLookup = {
  id: string;
  firstName: string;
  lastName: string;
};

function shortPaymentId(row: PaymentApiItem): string {
  if (row.transactionReference?.trim()) {
    return `#${row.transactionReference.trim()}`;
  }
  return `#PAY-${row.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`;
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

async function sumAmounts(params: {
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}): Promise<number> {
  const page = await api.get<PaginatedResponse<PaymentApiItem>>('/payments', {
    params: {
      page: 1,
      limit: 100,
      ...params,
    },
  });

  return page.data.reduce((sum, row) => {
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

async function countPayments(params: {
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}): Promise<number> {
  const page = await api.get<PaginatedResponse<PaymentApiItem>>('/payments', {
    params: {
      page: 1,
      limit: 1,
      ...params,
    },
  });
  return page.meta.total;
}

async function fetchFranchises(): Promise<FranchiseOption[]> {
  const page = await api.get<PaginatedResponse<FranchiseListItem>>(
    '/franchises',
    { params: { page: 1, limit: 100 } },
  );
  return page.data.map((row) => ({ id: row.id, name: row.name }));
}

async function lookupSalon(id: string): Promise<SalonLookup | null> {
  try {
    return await api.get<SalonLookup>(`/salons/${id}`);
  } catch {
    return null;
  }
}

async function lookupCustomer(id: string): Promise<CustomerLookup | null> {
  try {
    return await api.get<CustomerLookup>(`/customers/${id}`);
  } catch {
    return null;
  }
}

async function enrichRows(
  payments: PaymentApiItem[],
): Promise<PaymentListRow[]> {
  const salonIds = [
    ...new Set(
      payments
        .map((p) => p.salonId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const customerIds = [
    ...new Set(
      payments
        .map((p) => p.customerId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [salons, customers] = await Promise.all([
    Promise.all(salonIds.map(async (id) => [id, await lookupSalon(id)] as const)),
    Promise.all(
      customerIds.map(async (id) => [id, await lookupCustomer(id)] as const),
    ),
  ]);

  const salonMap = new Map(salons);
  const customerMap = new Map(customers);

  return payments.map((row) => {
    const salon = row.salonId ? salonMap.get(row.salonId) : null;
    const customer = row.customerId ? customerMap.get(row.customerId) : null;
    const businessName = salon?.name ?? (row.salonId ? 'Unknown salon' : '—');
    const customerName = customer
      ? formatFullName(customer)
      : row.customerId
        ? 'Unknown customer'
        : '—';

    return {
      id: row.id,
      displayId: shortPaymentId(row),
      businessName,
      businessInitials: initials(businessName),
      customerName,
      customerInitials: initials(customerName),
      amount: Number(row.amount) || 0,
      method: row.paymentMethod,
      methodLabel: PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod,
      paymentDate: row.paymentDate,
      status: row.status,
      statusLabel: PAYMENT_STATUS_LABELS[row.status] ?? row.status,
      franchiseId: salon?.franchiseId ?? null,
    };
  });
}

function buildMetrics(amounts: {
  total: number;
  successful: number;
  pending: number;
  failed: number;
}): DashboardMetric[] {
  return [
    {
      id: 'total-payments',
      label: 'Total Payments',
      value: String(amounts.total),
      rawValue: amounts.total,
      comparisonLabel: 'selected period',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'successful-payments',
      label: 'Successful Payments',
      value: String(amounts.successful),
      rawValue: amounts.successful,
      comparisonLabel: 'selected period',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'pending-payments',
      label: 'Pending Payments',
      value: String(amounts.pending),
      rawValue: amounts.pending,
      comparisonLabel: 'selected period',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'failed-payments',
      label: 'Failed Payments',
      value: String(amounts.failed),
      rawValue: amounts.failed,
      comparisonLabel: 'selected period',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];
}

function buildSummary(counts: {
  success: number;
  pending: number;
  failed: number;
}): { slices: PaymentSummarySlice[]; total: number } {
  const total = counts.success + counts.pending + counts.failed;
  const denom = Math.max(total, 1);

  return {
    total,
    slices: [
      {
        key: 'SUCCESS',
        label: 'Successful',
        count: counts.success,
        percent: (counts.success / denom) * 100,
        color: 'var(--bv-emerald)',
      },
      {
        key: 'PENDING',
        label: 'Pending',
        count: counts.pending,
        percent: (counts.pending / denom) * 100,
        color: 'var(--bv-warning)',
      },
      {
        key: 'FAILED',
        label: 'Failed',
        count: counts.failed,
        percent: (counts.failed / denom) * 100,
        color: 'var(--bv-danger)',
      },
    ],
  };
}

function needsClientFilter(params: PaymentsListParams): boolean {
  return Boolean(params.search.trim()) || params.franchiseId !== 'all';
}

/**
 * Loads Super Admin payments page data from `/payments`, with salon/customer
 * name enrichment. Search and franchise filters are applied client-side until
 * the payments API supports them.
 */
export async function fetchPaymentsPage(
  params: PaymentsListParams,
): Promise<PaymentsPageData> {
  const dateParams = {
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };

  const apiStatus =
    params.status === 'all' ? undefined : (params.status as PaymentStatus);
  const apiMethod =
    params.method === 'all' ? undefined : (params.method as PaymentMethod);

  const clientFilter = needsClientFilter(params);

  const listParams: Record<string, string | number> = {
    page: clientFilter ? 1 : params.page,
    limit: clientFilter ? 100 : params.limit,
  };
  if (apiStatus) listParams.status = apiStatus;
  if (apiMethod) listParams.paymentMethod = apiMethod;
  if (dateParams.dateFrom) listParams.dateFrom = dateParams.dateFrom;
  if (dateParams.dateTo) listParams.dateTo = dateParams.dateTo;

  const [
    listPage,
    franchises,
    totalAmount,
    successfulAmount,
    pendingAmount,
    failedAmount,
    successCount,
    pendingCount,
    failedCount,
  ] = await Promise.all([
    api.get<PaginatedResponse<PaymentApiItem>>('/payments', {
      params: listParams,
    }),
    fetchFranchises(),
    sumAmounts(dateParams),
    sumAmounts({ ...dateParams, status: 'SUCCESS' }),
    sumAmounts({ ...dateParams, status: 'PENDING' }),
    sumAmounts({ ...dateParams, status: 'FAILED' }),
    countPayments({ ...dateParams, status: 'SUCCESS' }),
    countPayments({ ...dateParams, status: 'PENDING' }),
    countPayments({ ...dateParams, status: 'FAILED' }),
  ]);

  let rows = await enrichRows(listPage.data);
  let meta = listPage.meta;

  if (clientFilter) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter((row) => {
      if (
        params.franchiseId !== 'all' &&
        row.franchiseId !== params.franchiseId
      ) {
        return false;
      }
      if (!q) return true;
      return (
        row.displayId.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q) ||
        row.businessName.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q)
      );
    });

    const total = rows.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);
    const page = Math.min(params.page, Math.max(totalPages, 1));
    const start = (page - 1) * params.limit;
    rows = rows.slice(start, start + params.limit);
    meta = {
      page,
      limit: params.limit,
      total,
      totalPages,
    };
  }

  const summary = buildSummary({
    success: successCount,
    pending: pendingCount,
    failed: failedCount,
  });

  return {
    metrics: buildMetrics({
      total: totalAmount,
      successful: successfulAmount,
      pending: pendingAmount,
      failed: failedAmount,
    }),
    rows,
    meta,
    summary: summary.slices,
    totalCount: summary.total,
    franchises,
  };
}

export function defaultPaymentsDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  return {
    dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
  };
}
