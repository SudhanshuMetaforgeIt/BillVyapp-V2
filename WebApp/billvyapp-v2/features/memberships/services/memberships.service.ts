import { isValid, parseISO, addDays, isBefore, isAfter } from "date-fns";

import { api } from "@/services/api-client";
import {
  businessCalendarDateOfInstant,
  businessMonthBounds,
} from "@/lib/business-calendar";
import { formatCurrency, formatDate, formatFullName } from "@/lib/format";
import type { DashboardMetric } from "@/features/dashboard/services/dashboard.service";
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
} from "../types/memberships.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function maskPhone(phone: string): string {
  if (!/^[0-9]{10}$/.test(phone)) return phone || "—";
  return `+91 ***** *${phone.slice(6)}`;
}

function formatDateOnly(value: string): string {
  return formatDate(value);
}

function durationLabel(days: number): string {
  return `${days} calendar days`;
}

function statusLabel(
  status: MembershipStatus,
  isExpiringSoon: boolean,
): string {
  if (status === "ACTIVE" && isExpiringSoon) return "Expiring Soon";
  if (status === "PENDING") return "Pending";
  if (status === "ACTIVE") return "Active";
  if (status === "EXPIRED") return "Expired";
  return "Cancelled";
}

function isExpiringSoon(status: MembershipStatus, endDate: string): boolean {
  if (status !== "ACTIVE") return false;
  const end = parseISO(endDate);
  if (!isValid(end)) return false;
  const now = new Date();
  const soon = addDays(now, 14);
  return !isBefore(end, now) && !isAfter(end, soon);
}

function isExpiringThisMonth(row: MembershipApiItem): boolean {
  if (row.status !== "ACTIVE") return false;
  const end = row.endDate?.slice(0, 10);
  if (!end) return false;
  const { dateFrom, dateTo } = businessMonthBounds();
  return end >= dateFrom && end <= dateTo;
}

async function countMemberships(status?: MembershipStatus, salonId?: string) {
  const page = await api.get<PaginatedResponse<MembershipApiItem>>(
    "/memberships",
    {
      params: { page: 1, limit: 1, status: status || undefined, salonId },
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
      id: "mem-total",
      label: "Total Members",
      value: String(input.total),
      rawValue: input.total,
      comparisonLabel: "current total",
      changePercent: null,
      tone: "accent",
      comparisonIsPlaceholder: false,
    },
    {
      id: "mem-active",
      label: "Active Members",
      value: String(input.active),
      rawValue: input.active,
      comparisonLabel: "current total",
      changePercent: null,
      tone: "success",
      comparisonIsPlaceholder: false,
    },
    {
      id: "mem-expiring",
      label: "Expiring This Month",
      value: String(input.expiringThisMonth),
      rawValue: input.expiringThisMonth,
      comparisonLabel: input.expiringIncomplete
        ? "from recent members"
        : "end date this month",
      changePercent: null,
      tone: "neutral",
      comparisonIsPlaceholder: input.expiringIncomplete,
    },
    {
      id: "mem-plans",
      label: "Active Plans",
      value: String(input.plans),
      rawValue: input.plans,
      comparisonLabel: "current total",
      changePercent: null,
      tone: "accent",
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
  const name = customer ? formatFullName(customer) : "Unknown customer";
  const expiring = isExpiringSoon(row.status, row.endDate);

  return {
    id: row.id,
    serial: (page - 1) * limit + index + 1,
    customerId: row.customerId,
    memberName: name === "-" ? "Unknown customer" : name,
    initials: initials(name === "-" ? "" : name),
    phoneMasked: maskPhone(customer?.phone ?? ""),
    planId: row.membershipPlanId,
    couponCode: row.couponCode,
    includedServices:
      row.planSnapshot?.eligibleServices.map((s) => s.name).join(", ") ??
      plan?.eligibleServices?.map((s) => s.name).join(", "),
    qualifyingBillNumber: row.qualifyingBill?.billNumber,
    planName: row.membershipName ?? plan?.name ?? "—",
    startDateLabel: formatDateOnly(row.startDate),
    endDateLabel: formatDateOnly(row.endDate),
    dateRangeLabel: `${formatDateOnly(row.startDate)} to ${formatDateOnly(row.endDate)}`,
    visitsLeftLabel: "—",
    status: row.status,
    statusLabel: statusLabel(row.status, expiring),
    isExpiringSoon: expiring,
    planPriceLabel: row.planSnapshot
      ? formatCurrency(row.planSnapshot.price)
      : plan
        ? formatCurrency(plan.price)
        : "—",
  };
}

function buildMonthSummary(
  memberships: MembershipApiItem[],
  planById: Map<string, MembershipPlanApiItem>,
  incomplete: boolean,
): MonthSummary {
  const { dateFrom: monthStart, dateTo: monthEnd } = businessMonthBounds();

  const createdThisMonth = memberships.filter((row) => {
    const created = parseISO(row.createdAt);
    if (!isValid(created)) return false;
    const key = businessCalendarDateOfInstant(created);
    return key >= monthStart && key <= monthEnd;
  });

  const revenue = createdThisMonth.reduce((sum, row) => {
    const plan = planById.get(row.membershipPlanId);
    return (
      sum +
      (row.qualifyingBillId
        ? 0
        : Number(row.planSnapshot?.price ?? plan?.price ?? 0) || 0)
    );
  }, 0);

  return {
    newMemberships: createdThisMonth.length,
    renewedLabel: "—",
    revenueLabel: formatCurrency(revenue),
    visitsLabel: "—",
    incomplete,
  };
}

export async function fetchMembershipsPage(
  params: MembershipsListParams,
): Promise<MembershipsPageData> {
  const needsClientMemberFilter =
    Boolean(params.search.trim()) ||
    Boolean(params.planId) ||
    params.status === "expiring";

  const [
    membersPage,
    candidatesPage,
    plansPage,
    activePlansMeta,
    customersPage,
    totalMembers,
    activeMembers,
  ] = await Promise.all([
    needsClientMemberFilter || params.tab === "plans"
      ? Promise.resolve({
          data: [] as MembershipApiItem[],
          meta: { page: 1, limit: params.limit, total: 0, totalPages: 0 },
        })
      : api.get<PaginatedResponse<MembershipApiItem>>("/memberships", {
          params: {
            salonId: params.salonId || undefined,
            page: params.page,
            limit: params.limit,
            status:
              params.status !== "all" && params.status !== "expiring"
                ? params.status
                : undefined,
          },
        }),
    api.get<PaginatedResponse<MembershipApiItem>>("/memberships", {
      params: { page: 1, limit: 100, salonId: params.salonId || undefined },
    }),
    api.get<PaginatedResponse<MembershipPlanApiItem>>("/membership-plans", {
      params: {
        salonId: params.salonId || undefined,
        page: params.tab === "plans" ? params.page : 1,
        limit: params.tab === "plans" ? params.limit : 100,
        search:
          params.tab === "plans" && params.search.trim()
            ? params.search.trim()
            : undefined,
      },
    }),
    api.get<PaginatedResponse<MembershipPlanApiItem>>("/membership-plans", {
      params: {
        page: 1,
        limit: 1,
        isActive: true,
        salonId: params.salonId || undefined,
      },
    }),
    api.get<PaginatedResponse<CustomerLite>>("/customers", {
      params: {
        page: 1,
        limit: 100,
        search: params.search.trim() || undefined,
      },
    }),
    countMemberships(undefined, params.salonId),
    countMemberships("ACTIVE", params.salonId),
  ]);

  const candidates = candidatesPage.data;
  const candidatesComplete =
    candidatesPage.meta.total <= candidatesPage.data.length;

  const planById = new Map(plansPage.data.map((plan) => [plan.id, plan]));
  // Ensure plan map is complete for member joins when plans tab is paginated.
  if (params.tab === "plans" || plansPage.data.length < 100) {
    const allPlans = await api.get<PaginatedResponse<MembershipPlanApiItem>>(
      "/membership-plans",
      { params: { page: 1, limit: 100, salonId: params.salonId || undefined } },
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
  if (params.search.trim() && params.tab === "members") {
    const allCustomers = await api.get<PaginatedResponse<CustomerLite>>(
      "/customers",
      { params: { page: 1, limit: 100, salonId: params.salonId || undefined } },
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
    isActive: plan.isActive,
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

  if (params.tab === "members") {
    if (needsClientMemberFilter) {
      const searchCustomerIds = params.search.trim()
        ? new Set(
            (
              await api.get<PaginatedResponse<CustomerLite>>("/customers", {
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
        if (params.status === "expiring") {
          return isExpiringSoon(row.status, row.endDate);
        }
        if (params.status !== "all" && row.status !== params.status) {
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

  if (params.tab === "plans") {
    planRows = plansPage.data.map((plan) => ({
      plan,
      salonName: plan.salonName ?? plan.salonId,
      thresholdLabel:
        plan.enrollmentThreshold == null
          ? "Disabled"
          : formatCurrency(plan.enrollmentThreshold),
      servicesLabel:
        plan.eligibleServices?.map((s) => s.name).join(", ") || "None",
      id: plan.id,
      name: plan.name,
      description: plan.description?.trim() || "—",
      priceLabel: formatCurrency(plan.price),
      durationLabel: durationLabel(plan.durationDays),
      memberCount: memberCounts.get(plan.id) ?? 0,
      isActive: plan.isActive,
      statusLabel: plan.isActive ? "Active" : "Inactive",
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
  return api.post<MembershipApiItem>("/memberships", payload);
}

export async function createMembershipPlan(
  payload: CreateMembershipPlanPayload,
) {
  return api.post<MembershipPlanApiItem>("/membership-plans", payload);
}

export async function updateMembershipPlan(
  id: string,
  payload: Omit<CreateMembershipPlanPayload, "salonId" | "isActive">,
) {
  return api.patch<MembershipPlanApiItem>(`/membership-plans/${id}`, payload);
}
export async function setMembershipPlanStatus(id: string, isActive: boolean) {
  return api.patch<MembershipPlanApiItem>(`/membership-plans/${id}/status`, {
    isActive,
  });
}
/** Load every service page; selection must not silently omit larger catalogs. */
export async function fetchMembershipServices(salonId: string) {
  const services: { id: string; name: string }[] = [];
  let page = 1;
  while (true) {
    const result = await api.get<
      PaginatedResponse<{ id: string; name: string }>
    >("/services", { params: { salonId, page, limit: 100 } });
    services.push(...result.data);
    if (page >= result.meta.totalPages) return services;
    page++;
  }
}
