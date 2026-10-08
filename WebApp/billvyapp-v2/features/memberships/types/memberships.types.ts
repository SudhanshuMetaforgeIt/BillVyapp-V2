export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type MembershipsTab = "members" | "plans";

export type MembershipStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type MembershipStatusFilter = "all" | MembershipStatus | "expiring";

export type UpdateMembershipPayload = {
  membershipPlanId?: string;
  startDate?: string;
};

export type MembershipApiItem = {
  id: string;
  couponCode?: string | null;
  qualifyingBillId?: string | null;
  qualifyingBill?: { id: string; billNumber: string } | null;
  membershipName?: string;
  planSnapshot?: {
    name: string;
    price: string;
    benefits: string | null;
    durationDays: number;
    eligibleServices: { id: string; name: string }[];
  } | null;
  customerId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  salonId: string;
  createdAt: string;
  updatedAt: string;
};

export type MembershipPlanApiItem = {
  couponUsageLimit?: number | null;
  termsAndConditions?: string | null;
  benefitType?: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';
  discountPercentage?: string | number | null;
  freeServiceLimit?: number | null;
  freeServicesPerVisit?: boolean;

  benefits?: string | null;
  enrollmentThreshold?: string | null;
  couponPrefix?: string | null;
  eligibleServices?: { id: string; name: string }[];
  salonName?: string;
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  price: string;
  durationDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerLite = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type MemberListRow = {
  couponCode?: string | null;
  includedServices?: string;
  qualifyingBillNumber?: string | null;
  id: string;
  serial: number;
  customerId: string;
  memberName: string;
  initials: string;
  phoneMasked: string;
  planId: string;
  planName: string;
  startDateLabel: string;
  endDateLabel: string;
  dateRangeLabel: string;
  visitsLeftLabel: string;
  status: MembershipStatus;
  statusLabel: string;
  isExpiringSoon: boolean;
  planPriceLabel: string;
};

export type PlanListRow = {
  plan?: MembershipPlanApiItem;
  salonName?: string;
  thresholdLabel?: string;
  servicesLabel?: string;
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  durationLabel: string;
  memberCount: number;
  isActive: boolean;
  statusLabel: string;
};

export type PopularPlanRow = {
  id: string;
  name: string;
  priceLabel: string;
  durationLabel: string;
  memberCount: number;
};

export type MonthSummary = {
  newMemberships: number;
  renewedLabel: string;
  revenueLabel: string;
  visitsLabel: string;
  incomplete: boolean;
};

export type MembershipsListParams = {
  salonId?: string;
  tab: MembershipsTab;
  page: number;
  limit: number;
  search: string;
  planId: string;
  status: MembershipStatusFilter;
};

export type MembershipsPageData = {
  memberRows: MemberListRow[];
  planRows: PlanListRow[];
  memberMeta: PaginationMeta;
  planMeta: PaginationMeta;
  metrics: import("@/features/dashboard/services/dashboard.service").DashboardMetric[];
  planOptions: Array<{ id: string; name: string; isActive?: boolean }>;
  customerOptions: Array<{ id: string; name: string; phone: string }>;
  popularPlans: PopularPlanRow[];
  monthSummary: MonthSummary;
};

export type CreateMembershipPayload = {
  customerId: string;
  membershipPlanId: string;
  startDate?: string;
};

export type CreateMembershipPlanPayload = {
  couponUsageLimit?: number | null;
  termsAndConditions?: string | null;
  benefitType?: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';
  discountPercentage?: number | null;
  freeServiceLimit?: number | null;
  freeServicesPerVisit?: boolean;

  benefits?: string | null;
  enrollmentThreshold?: number | null;
  couponPrefix?: string | null;
  eligibleServiceIds?: string[];
  isActive?: boolean;
  salonId: string;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
};
