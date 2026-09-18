import {
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  addDays,
  isBefore,
  isAfter,
} from 'date-fns';

import { api } from '@/services/api-client';
import { formatCurrency, formatFullName } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  CreateMembershipPayload,
  CreateMembershipPlanPayload,
  CustomerLite,
  MemberListRow,
  MembershipApiItem,
  MembershipPlanApiItem,
  MembershipsListParams,
  MembershipsPageData,
  MembershipStatus,
  MonthSummary,
  PaginatedResponse,
  PlanListRow,
  PopularPlanRow,
} from '../types/memberships.types';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function maskPhone(phone: string): string {
  if (!/^[0-9]{10}$/.test(phone)) return phone || '—';
  return `+91 ***** *${phone.slice(6)}`;
}

function formatDateOnly(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd MMM yyyy') : value;
}

function durationLabel(days: number): string {
  if (days % 365 === 0 && days >= 365) {
    const years = days / 365;
    return `${years} ${years === 1 ? 'Year' : 'Years'}`;
  }
  if (days % 30 === 0 && days >= 30) {
    const months = days / 30;
    return `${months} ${months === 1 ? 'Month' : 'Months'}`;
  }
  return `${days} days`;
}

function statusLabel(
  status: MembershipStatus,
  isExpiringSoon: boolean,
): string {
  if (status === 'ACTIVE' && isExpiringSoon) return 'Expiring Soon';
  if (status === 'PENDING') return 'Pending';
  if (status === 'ACTIVE') return 'Active';
  if (status === 'EXPIRED') return 'Expired';
  return 'Cancelled';
}

function isExpiringSoon(status: MembershipStatus, endDate: string): boolean {
  if (status !== 'ACTIVE') return false;
  const end = parseISO(endDate);
  if (!isValid(end)) return false;
  const now = new Date();
  const soon = addDays(now, 14);
  return !isBefore(end, now) && !isAfter(end, soon);
}

function isExpiringThisMonth(row: MembershipApiItem): boolean {
  if (row.status !== 'ACTIVE') return false;
  const end = parseISO(row.endDate);
  if (!isValid(end)) return false;
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  return !isBefore(end, monthStart) && !isAfter(end, monthEnd);
}

async function countMemberships(status?: MembershipStatus) {
  const page = await api.get<PaginatedResponse<MembershipApiItem>>(
    '/memberships',
    {
      params: { page: 1, limit: 1, status: status || undefined },
    },
  );
  return page.meta.total;
}

function buildMetrics(input: {
  total: number;
  active: number;
  expiringThisMonth: number;
  plans: number;
  expiringIncomplete: boolean;
}): DashboardMetric[] {
  return [
    {
      id: 'mem-total',
      label: 'Total Members',
      value: String(input.total),
      rawValue: input.total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'mem-active',
      label: 'Active Members',
      value: String(input.active),
      rawValue: input.active,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'mem-expiring',
      label: 'Expiring This Month',
      value: String(input.expiringThisMonth),
      rawValue: input.expiringThisMonth,
      comparisonLabel: input.expiringIncomplete
        ? 'from recent members'
        : 'end date this month',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: input.expiringIncomplete,
    },
    {
      id: 'mem-plans',
      label: 'Active Plans',
      value: String(input.plans),
      rawValue: input.plans,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
  ];
}

function mapMemberRow(
  row: MembershipApiItem,
  index: number,
  page: number,
  limit: number,
  customerById: Map<string, CustomerLite>,
  planById: Map<string, MembershipPlanApiItem>,
): MemberListRow {
  const customer = customerById.get(row.customerId);
  const plan = planById.get(row.membershipPlanId);
  const name = customer
    ? formatFullName(customer)
    : 'Unknown customer';
  const expiring = isExpiringSoon(row.status, row.endDate);

  return {
    id: row.id,
    serial: (page - 1) * limit + index + 1,
    customerId: row.customerId,
    memberName: name === '-' ? 'Unknown customer' : name,
    initials: initials(name === '-' ? '' : name),
    phoneMasked: maskPhone(customer?.phone ?? ''),
    planId: row.membershipPlanId,
    planName: plan?.name ?? '—',
    startDateLabel: formatDateOnly(row.startDate),
    endDateLabel: formatDateOnly(row.endDate),
    dateRangeLabel: `${formatDateOnly(row.startDate)} to ${formatDateOnly(row.endDate)}`,
    visitsLeftLabel: '—',
    status: row.status,
    statusLabel: statusLabel(row.status, expiring),
    isExpiringSoon: expiring,
    planPriceLabel: plan ? formatCurrency(plan.price) : '—',
  };
}

function buildMonthSummary(
  memberships: MembershipApiItem[],
  planById: Map<string, MembershipPlanApiItem>,
  incomplete: boolean,
): MonthSummary {
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const createdThisMonth = memberships.filter((row) => {
    const created = parseISO(row.createdAt);
    if (!isValid(created)) return false;
    const key = format(created, 'yyyy-MM-dd');
    return key >= monthStart && key <= monthEnd;
  });

  const revenue = createdThisMonth.reduce((sum, row) => {
    const plan = planById.get(row.membershipPlanId);
    return sum + (plan ? Number(plan.price) || 0 : 0);
  }, 0);

  return {
    newMemberships: createdThisMonth.length,
    renewedLabel: '—',
    revenueLabel: formatCurrency(revenue),
    visitsLabel: '—',
    incomplete,
  };
}

export async function fetchMembershipsPage(
  params: MembershipsListParams,
): Promise<MembershipsPageData> {
  const needsClientMemberFilter =
    Boolean(params.search.trim()) ||
    Boolean(params.planId) ||
    params.status === 'expiring';

  const [
    membersPage,
    candidatesPage,
    plansPage,
    activePlansMeta,
    customersPage,
    totalMembers,
    activeMembers,
  ] = await Promise.all([
    needsClientMemberFilter || params.tab === 'plans'
      ? Promise.resolve({
          data: [] as MembershipApiItem[],
          meta: { page: 1, limit: params.limit, total: 0, totalPages: 0 },
        })
      : api.get<PaginatedResponse<MembershipApiItem>>('/memberships', {
          params: {
            page: params.page,
            limit: params.limit,
            status:
              params.status !== 'all' && params.status !== 'expiring'
                ? params.status
                : undefined,
          },
        }),
    api.get<PaginatedResponse<MembershipApiItem>>('/memberships', {
      params: { page: 1, limit: 100 },
    }),
    api.get<PaginatedResponse<MembershipPlanApiItem>>('/membership-plans', {
      params: {
        page: params.tab === 'plans' ? params.page : 1,
        limit: params.tab === 'plans' ? params.limit : 100,
        search:
          params.tab === 'plans' && params.search.trim()
            ? params.search.trim()
            : undefined,
      },
    }),
    api.get<PaginatedResponse<MembershipPlanApiItem>>('/membership-plans', {
      params: { page: 1, limit: 1, isActive: true },
    }),
    api.get<PaginatedResponse<CustomerLite>>('/customers', {
      params: {
        page: 1,
        limit: 100,
        search: params.search.trim() || undefined,
      },
    }),
    countMemberships(),
    countMemberships('ACTIVE'),
  ]);

  const candidates = candidatesPage.data;
  const candidatesComplete =
    candidatesPage.meta.total <= candidatesPage.data.length;

  const planById = new Map(plansPage.data.map((plan) => [plan.id, plan]));
  // Ensure plan map is complete for member joins when plans tab is paginated.
  if (params.tab === 'plans' || plansPage.data.length < 100) {
    const allPlans = await api.get<PaginatedResponse<MembershipPlanApiItem>>(
      '/membership-plans',
      { params: { page: 1, limit: 100 } },
    );
    for (const plan of allPlans.data) {
      planById.set(plan.id, plan);
    }
  }

  const customerById = new Map(
    customersPage.data.map((customer) => [customer.id, customer]),
  );

  // When searching members, customersPage is search-scoped; still load a
  // broad customer map for display of non-matching pages.
  if (params.search.trim() && params.tab === 'members') {
    const allCustomers = await api.get<PaginatedResponse<CustomerLite>>(
      '/customers',
      { params: { page: 1, limit: 100 } },
    );
    for (const customer of allCustomers.data) {
      if (!customerById.has(customer.id)) {
        customerById.set(customer.id, customer);
      }
    }
  }

  const expiringThisMonth = candidates.filter(isExpiringThisMonth).length;

  const metrics = buildMetrics({
    total: totalMembers,
    active: activeMembers,
    expiringThisMonth,
    plans: activePlansMeta.meta.total,
    expiringIncomplete: !candidatesComplete,
  });

  const planOptions = [...planById.values()].map((plan) => ({
    id: plan.id,
    name: plan.name,
  }));

  const customerOptions = [...customerById.values()].map((customer) => ({
    id: customer.id,
    name: formatFullName(customer),
    phone: customer.phone,
  }));

  const memberCounts = new Map<string, number>();
  for (const row of candidates) {
    memberCounts.set(
      row.membershipPlanId,
      (memberCounts.get(row.membershipPlanId) ?? 0) + 1,
    );
  }

  const popularPlans: PopularPlanRow[] = [...planById.values()]
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      priceLabel: formatCurrency(plan.price),
      durationLabel: durationLabel(plan.durationDays),
      memberCount: memberCounts.get(plan.id) ?? 0,
    }))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 5);

  const monthSummary = buildMonthSummary(
    candidates,
    planById,
    !candidatesComplete,
  );

  // ---- Members table ----
  let memberRows: MemberListRow[] = [];
  let memberMeta = membersPage.meta;

  if (params.tab === 'members') {
    if (needsClientMemberFilter) {
      const searchCustomerIds = params.search.trim()
        ? new Set(
            (
              await api.get<PaginatedResponse<CustomerLite>>('/customers', {
                params: {
                  page: 1,
                  limit: 100,
                  search: params.search.trim(),
                },
              })
            ).data.map((c) => c.id),
          )
        : null;

      const filtered = candidates.filter((row) => {
        if (params.planId && row.membershipPlanId !== params.planId) {
          return false;
        }
        if (params.status === 'expiring') {
          return isExpiringSoon(row.status, row.endDate);
        }
        if (params.status !== 'all' && row.status !== params.status) {
          return false;
        }
        if (searchCustomerIds && !searchCustomerIds.has(row.customerId)) {
          return false;
        }
        return true;
      });

      const total = filtered.length;
      const start = (params.page - 1) * params.limit;
      const pageSlice = filtered.slice(start, start + params.limit);
      memberRows = pageSlice.map((row, index) =>
        mapMemberRow(
          row,
          index,
          params.page,
          params.limit,
          customerById,
          planById,
        ),
      );
      memberMeta = {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / params.limit),
      };
    } else {
      memberRows = membersPage.data.map((row, index) =>
        mapMemberRow(
          row,
          index,
          params.page,
          params.limit,
          customerById,
          planById,
        ),
      );
    }
  }

  // ---- Plans table ----
  let planRows: PlanListRow[] = [];
  let planMeta = {
    page: 1,
    limit: params.limit,
    total: 0,
    totalPages: 0,
  };

  if (params.tab === 'plans') {
    planRows = plansPage.data.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description?.trim() || '—',
      priceLabel: formatCurrency(plan.price),
      durationLabel: durationLabel(plan.durationDays),
      memberCount: memberCounts.get(plan.id) ?? 0,
      isActive: plan.isActive,
      statusLabel: plan.isActive ? 'Active' : 'Inactive',
    }));
    planMeta = plansPage.meta;
  }

  return {
    memberRows,
    planRows,
    memberMeta,
    planMeta,
    metrics,
    planOptions,
    customerOptions,
    popularPlans,
    monthSummary,
  };
}

export async function createMembership(payload: CreateMembershipPayload) {
  return api.post<MembershipApiItem>('/memberships', payload);
}

export async function createMembershipPlan(
  payload: CreateMembershipPlanPayload,
) {
  return api.post<MembershipPlanApiItem>('/membership-plans', payload);
}
