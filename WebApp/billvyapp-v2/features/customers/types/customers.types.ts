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

export type CustomerGender =
  | 'MALE'
  | 'FEMALE'
  | 'OTHER'
  | 'PREFER_NOT_TO_SAY';

export type CustomerStatusFilter = 'all' | 'active' | 'inactive';

export type CustomerApiItem = {
  id: string;
  userId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  dateOfBirth: string | null;
  gender: CustomerGender | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MembershipApiItem = {
  id: string;
  customerId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  salonId: string;
};

export type MembershipPlanApiItem = {
  id: string;
  salonId: string;
  name: string;
  isActive: boolean;
};

export type CustomerListRow = {
  id: string;
  customerCode: string;
  fullName: string;
  initials: string;
  genderLabel: string;
  ageLabel: string;
  phone: string;
  phoneMasked: string;
  email: string;
  membershipLabel: string;
  membershipTone: 'gold' | 'silver' | 'platinum' | 'none' | 'expired';
  membershipExpiry: string;
  totalVisitsLabel: string;
  totalSpendLabel: string;
  lastVisitLabel: string;
  isActive: boolean;
  statusLabel: string;
};

export type CustomersListParams = {
  page: number;
  limit: number;
  search: string;
  gender: '' | CustomerGender;
  status: CustomerStatusFilter;
  membershipPlanId: string;
};

export type CustomersPageData = {
  rows: CustomerListRow[];
  meta: PaginationMeta;
  metrics: import('@/features/dashboard/services/dashboard.service').DashboardMetric[];
  planOptions: Array<{ id: string; name: string }>;
};

export type CreateCustomerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: CustomerGender;
  dateOfBirth?: string;
};
