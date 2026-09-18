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

export type MembershipsTab = 'members' | 'plans';

export type MembershipStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED';

export type MembershipStatusFilter = 'all' | MembershipStatus | 'expiring';

export type MembershipApiItem = {
  id: string;
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
  metrics: import('@/features/dashboard/services/dashboard.service').DashboardMetric[];
  planOptions: Array<{ id: string; name: string }>;
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
  salonId: string;
  name: string;
  description?: string | null;
  price: number;
  durationDays: number;
};
