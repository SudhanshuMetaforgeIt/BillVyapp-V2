import type { RoleCode } from '@/constants/roles';
import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/features/dashboard/types/dashboard.types';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';

export type { PaginatedResponse, PaginationMeta, DashboardMetric };

export type UserRoleRef = {
  id: string;
  name: string;
  code: RoleCode;
};

export type UserApiItem = {
  id: string;
  roleId: string;
  role: UserRoleRef;
  franchiseId: string | null;
  salonId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleOption = {
  id: string;
  name: string;
  code: RoleCode;
};

export type FranchiseOption = {
  id: string;
  name: string;
};

export type SalonOption = {
  id: string;
  name: string;
  franchiseId: string;
};

export type UserStatusFilter = 'all' | 'active' | 'inactive';

export type UsersListParams = {
  page: number;
  limit: number;
  search: string;
  roleId: string;
  franchiseId: string;
  status: UserStatusFilter;
};

export type UserListRow = {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  phone: string | null;
  roleCode: RoleCode;
  roleLabel: string;
  businessName: string;
  salonName: string | null;
  isActive: boolean;
  statusLabel: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserRoleSlice = {
  key: RoleCode;
  label: string;
  count: number;
  percent: number;
  color: string;
};

export type UsersPageData = {
  metrics: DashboardMetric[];
  rows: UserListRow[];
  meta: PaginationMeta;
  roleSummary: UserRoleSlice[];
  totalCount: number;
  roles: RoleOption[];
  franchises: FranchiseOption[];
};

export type CreateUserPayload = {
  roleId: string;
  franchiseId?: string | null;
  salonId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};
