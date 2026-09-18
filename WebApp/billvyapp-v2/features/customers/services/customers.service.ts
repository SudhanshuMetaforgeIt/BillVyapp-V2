import { format, isValid, parseISO, differenceInYears } from 'date-fns';

import { api } from '@/services/api-client';
import { formatFullName } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  CreateCustomerPayload,
  CustomerApiItem,
  CustomerGender,
  CustomerListRow,
  CustomersListParams,
  CustomersPageData,
  MembershipApiItem,
  MembershipPlanApiItem,
  PaginatedResponse,
} from '../types/customers.types';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function genderLabel(gender: CustomerGender | null): string {
  if (!gender) return '—';
  if (gender === 'PREFER_NOT_TO_SAY') return 'Prefer not to say';
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function ageLabel(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '—';
  const dob = parseISO(dateOfBirth);
  if (!isValid(dob)) return '—';
  const age = differenceInYears(new Date(), dob);
  return Number.isFinite(age) && age >= 0 ? String(age) : '—';
}

function maskPhone(phone: string): string {
  if (!/^[0-9]{10}$/.test(phone)) return phone || '—';
  return `+91 ***** *${phone.slice(6)}`;
}

function membershipTone(
  planName: string,
  status: MembershipApiItem['status'],
): CustomerListRow['membershipTone'] {
  if (status === 'EXPIRED' || status === 'CANCELLED') return 'expired';
  const lower = planName.toLowerCase();
  if (lower.includes('gold')) return 'gold';
  if (lower.includes('silver')) return 'silver';
  if (lower.includes('platinum')) return 'platinum';
  return 'none';
}

async function countCustomers(
  params: Record<string, string | number | boolean | undefined>,
) {
  const page = await api.get<PaginatedResponse<CustomerApiItem>>('/customers', {
    params: { page: 1, limit: 1, ...params },
  });
  return page.meta.total;
}

async function buildMetrics(
  activeMembershipCount: number,
): Promise<DashboardMetric[]> {
  const [total, active, inactive] = await Promise.all([
    countCustomers({}),
    countCustomers({ isActive: true }),
    countCustomers({ isActive: false }),
  ]);

  return [
    {
      id: 'cust-total',
      label: 'Total Customers',
      value: String(total),
      rawValue: total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'cust-active',
      label: 'Active Customers',
      value: String(active),
      rawValue: active,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'cust-inactive',
      label: 'Inactive Customers',
      value: String(inactive),
      rawValue: inactive,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'cust-memberships',
      label: 'Active Memberships',
      value: String(activeMembershipCount),
      rawValue: activeMembershipCount,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
  ];
}

function mapRow(
  row: CustomerApiItem,
  membershipByCustomer: Map<string, MembershipApiItem>,
  planById: Map<string, MembershipPlanApiItem>,
): CustomerListRow {
  const fullName = formatFullName(row);
  const membership = membershipByCustomer.get(row.id);
  const plan = membership
    ? planById.get(membership.membershipPlanId)
    : undefined;
  const planName = plan?.name ?? '';

  let membershipLabel = '—';
  let membershipExpiry = '';
  let tone: CustomerListRow['membershipTone'] = 'none';

  if (membership) {
    membershipLabel = planName || 'Membership';
    const end = membership.endDate ? parseISO(membership.endDate) : null;
    const endLabel =
      end && isValid(end) ? format(end, 'd MMM, yyyy') : '';

    if (membership.status === 'EXPIRED') {
      membershipExpiry = endLabel ? `Expired · ${endLabel}` : 'Expired';
    } else if (membership.status === 'CANCELLED') {
      membershipExpiry = 'Cancelled';
    } else if (endLabel) {
      membershipExpiry = `Valid till ${endLabel}`;
    }

    tone = membershipTone(planName, membership.status);
  }

  return {
    id: row.id,
    customerCode: row.customerCode,
    fullName,
    initials: initials(fullName === '-' ? '' : fullName),
    genderLabel: genderLabel(row.gender),
    ageLabel: ageLabel(row.dateOfBirth),
    phone: row.phone,
    phoneMasked: maskPhone(row.phone),
    email: row.email || '—',
    membershipLabel,
    membershipTone: tone,
    membershipExpiry,
    // No visit/spend/lastVisit aggregates on customer list APIs.
    totalVisitsLabel: '—',
    totalSpendLabel: '—',
    lastVisitLabel: '—',
    isActive: row.isActive,
    statusLabel: row.isActive ? 'Active' : 'Inactive',
  };
}

function pickMemberships(
  memberships: MembershipApiItem[],
): Map<string, MembershipApiItem> {
  const membershipByCustomer = new Map<string, MembershipApiItem>();
  const sorted = [...memberships].sort((a, b) =>
    b.endDate.localeCompare(a.endDate),
  );
  for (const membership of sorted) {
    const existing = membershipByCustomer.get(membership.customerId);
    if (!existing) {
      membershipByCustomer.set(membership.customerId, membership);
      continue;
    }
    if (existing.status !== 'ACTIVE' && membership.status === 'ACTIVE') {
      membershipByCustomer.set(membership.customerId, membership);
    }
  }
  return membershipByCustomer;
}

export async function fetchCustomersPage(
  params: CustomersListParams,
): Promise<CustomersPageData> {
  const isActive =
    params.status === 'active'
      ? true
      : params.status === 'inactive'
        ? false
        : undefined;

  const [customersPage, membershipsPage, plansPage] = await Promise.all([
    api.get<PaginatedResponse<CustomerApiItem>>('/customers', {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search.trim() || undefined,
        gender: params.gender || undefined,
        isActive,
      },
    }),
    api.get<PaginatedResponse<MembershipApiItem>>('/memberships', {
      params: { page: 1, limit: 100 },
    }),
    api.get<PaginatedResponse<MembershipPlanApiItem>>('/membership-plans', {
      params: { page: 1, limit: 100, isActive: true },
    }),
  ]);

  const planById = new Map(plansPage.data.map((plan) => [plan.id, plan]));
  const membershipByCustomer = pickMemberships(membershipsPage.data);

  const activeMembershipCount = membershipsPage.data.filter(
    (m) => m.status === 'ACTIVE',
  ).length;

  // Active memberships total may be truncated when salon has >100 memberships.
  const membershipCountIsComplete =
    membershipsPage.meta.total <= membershipsPage.data.length;

  const metrics = await buildMetrics(activeMembershipCount);
  if (!membershipCountIsComplete) {
    const membershipMetric = metrics.find((m) => m.id === 'cust-memberships');
    if (membershipMetric) {
      membershipMetric.comparisonLabel = 'from recent memberships';
      membershipMetric.comparisonIsPlaceholder = true;
    }
  }

  let rows = customersPage.data.map((row) =>
    mapRow(row, membershipByCustomer, planById),
  );

  // Membership plan filter is client-side on the current customers page
  // (API has no planId filter). Meta reflects the filtered subset only.
  if (params.membershipPlanId) {
    rows = rows.filter((row) => {
      const membership = membershipByCustomer.get(row.id);
      return membership?.membershipPlanId === params.membershipPlanId;
    });

    return {
      rows,
      meta: {
        page: 1,
        limit: params.limit,
        total: rows.length,
        totalPages: rows.length === 0 ? 0 : 1,
      },
      metrics,
      planOptions: plansPage.data.map((plan) => ({
        id: plan.id,
        name: plan.name,
      })),
    };
  }

  return {
    rows,
    meta: customersPage.meta,
    metrics,
    planOptions: plansPage.data.map((plan) => ({
      id: plan.id,
      name: plan.name,
    })),
  };
}

export async function createCustomer(payload: CreateCustomerPayload) {
  return api.post<CustomerApiItem>('/customers', payload);
}
