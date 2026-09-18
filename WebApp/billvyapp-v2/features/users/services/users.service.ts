import { api } from '@/services/api-client';
import { ROLE_LABELS, type RoleCode, isRoleCode } from '@/constants/roles';
import { formatFullName } from '@/lib/format';
import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  FranchiseListItem,
  PaginatedResponse,
} from '@/features/dashboard/types/dashboard.types';
import {
  ROLE_DONUT_COLORS,
} from '../data/placeholders';
import type {
  CreateUserPayload,
  FranchiseOption,
  RoleOption,
  SalonOption,
  UserApiItem,
  UserListRow,
  UserRoleSlice,
  UsersListParams,
  UsersPageData,
} from '../types/users.types';

type RoleApiItem = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
};

type SalonApiItem = {
  id: string;
  name: string;
  franchiseId: string;
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function toRoleCode(code: string): RoleCode {
  return isRoleCode(code) ? code : 'STAFF';
}

async function countUsers(params: Record<string, string | number | boolean>) {
  const page = await api.get<PaginatedResponse<UserApiItem>>('/users', {
    params: { page: 1, limit: 1, ...params },
  });
  return page.meta.total;
}

async function fetchRoles(): Promise<RoleOption[]> {
  const roles = await api.get<RoleApiItem[]>('/roles');
  return roles
    .filter((role) => role.code !== 'CUSTOMER')
    .map((role) => ({
      id: role.id,
      name: role.name,
      code: toRoleCode(role.code),
    }));
}

async function fetchFranchises(): Promise<FranchiseOption[]> {
  const page = await api.get<PaginatedResponse<FranchiseListItem>>(
    '/franchises',
    { params: { page: 1, limit: 100 } },
  );
  return page.data.map((row) => ({ id: row.id, name: row.name }));
}

async function lookupFranchiseName(
  id: string | null,
  cache: Map<string, string>,
): Promise<string> {
  if (!id) return 'Platform';
  if (cache.has(id)) return cache.get(id)!;
  try {
    const franchise = await api.get<{ id: string; name: string }>(
      `/franchises/${id}`,
    );
    cache.set(id, franchise.name);
    return franchise.name;
  } catch {
    return 'Unknown business';
  }
}

async function lookupSalonName(
  id: string | null,
  cache: Map<string, string>,
): Promise<string | null> {
  if (!id) return null;
  if (cache.has(id)) return cache.get(id)!;
  try {
    const salon = await api.get<{ id: string; name: string }>(`/salons/${id}`);
    cache.set(id, salon.name);
    return salon.name;
  } catch {
    return 'Unknown salon';
  }
}

async function enrichRows(users: UserApiItem[]): Promise<UserListRow[]> {
  const franchiseCache = new Map<string, string>();
  const salonCache = new Map<string, string>();

  return Promise.all(
    users.map(async (user) => {
      const fullName = formatFullName(user);
      const roleCode = toRoleCode(user.role.code);
      const [businessName, salonName] = await Promise.all([
        lookupFranchiseName(user.franchiseId, franchiseCache),
        lookupSalonName(user.salonId, salonCache),
      ]);

      return {
        id: user.id,
        fullName,
        initials: initials(fullName),
        email: user.email,
        phone: user.phone,
        roleCode,
        roleLabel: ROLE_LABELS[roleCode],
        businessName,
        salonName,
        isActive: user.isActive,
        statusLabel: user.isActive ? 'Active' : 'Inactive',
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      };
    }),
  );
}

function buildMetrics(counts: {
  total: number;
  active: number;
  inactive: number;
  admins: number;
}): DashboardMetric[] {
  return [
    {
      id: 'total-users-panel',
      label: 'Total Users',
      value: String(counts.total),
      rawValue: counts.total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'active-users-panel',
      label: 'Active Users',
      value: String(counts.active),
      rawValue: counts.active,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'inactive-users-panel',
      label: 'Inactive Users',
      value: String(counts.inactive),
      rawValue: counts.inactive,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'admin-users-panel',
      label: 'Admins',
      value: String(counts.admins),
      rawValue: counts.admins,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];
}

function buildRoleSummary(
  roles: RoleOption[],
  countsByRoleId: Map<string, number>,
): { slices: UserRoleSlice[]; total: number } {
  const platformRoles = roles.filter((r) => r.code !== 'CUSTOMER');
  const slices: UserRoleSlice[] = platformRoles.map((role) => ({
    key: role.code,
    label: ROLE_LABELS[role.code],
    count: countsByRoleId.get(role.id) ?? 0,
    percent: 0,
    color: ROLE_DONUT_COLORS[role.code] ?? 'var(--bv-champagne)',
  }));

  const total = slices.reduce((sum, s) => sum + s.count, 0);
  const denom = Math.max(total, 1);

  return {
    total,
    slices: slices.map((s) => ({
      ...s,
      percent: (s.count / denom) * 100,
    })),
  };
}

/**
 * Loads Super Admin users page: KPIs, filtered list, role mix, and filter options.
 */
export async function fetchUsersPage(
  params: UsersListParams,
): Promise<UsersPageData> {
  const listParams: Record<string, string | number | boolean> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search.trim()) listParams.search = params.search.trim();
  if (params.roleId !== 'all') listParams.roleId = params.roleId;
  if (params.franchiseId !== 'all') listParams.franchiseId = params.franchiseId;
  if (params.status === 'active') listParams.isActive = true;
  if (params.status === 'inactive') listParams.isActive = false;

  const [roles, franchises, listPage] = await Promise.all([
    fetchRoles(),
    fetchFranchises(),
    api.get<PaginatedResponse<UserApiItem>>('/users', { params: listParams }),
  ]);

  const [active, inactive, ...roleCountEntries] = await Promise.all([
    countUsers({ isActive: true }),
    countUsers({ isActive: false }),
    ...roles.map(async (role) => {
      const count = await countUsers({ roleId: role.id });
      return [role.id, count] as const;
    }),
  ]);

  const countsByRoleId = new Map(roleCountEntries);
  const adminRole = roles.find((r) => r.code === 'ADMIN');
  const superAdminRole = roles.find((r) => r.code === 'SUPER_ADMIN');
  const total = active + inactive;
  const admins =
    (adminRole ? (countsByRoleId.get(adminRole.id) ?? 0) : 0) +
    (superAdminRole ? (countsByRoleId.get(superAdminRole.id) ?? 0) : 0);

  const rows = await enrichRows(listPage.data);
  const summary = buildRoleSummary(roles, countsByRoleId);

  return {
    metrics: buildMetrics({
      total,
      active,
      inactive,
      admins,
    }),
    rows,
    meta: listPage.meta,
    roleSummary: summary.slices,
    totalCount: summary.total,
    roles,
    franchises,
  };
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserApiItem> {
  return api.post<UserApiItem>('/users', {
    roleId: payload.roleId,
    franchiseId: payload.franchiseId ?? null,
    salonId: payload.salonId ?? null,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim(),
    phone: payload.phone?.trim() || undefined,
    password: payload.password,
  });
}

export async function updateUserStatus(
  id: string,
  isActive: boolean,
): Promise<UserApiItem> {
  return api.patch<UserApiItem>(`/users/${id}/status`, { isActive });
}

export async function fetchSalonsForFranchise(
  franchiseId: string,
): Promise<SalonOption[]> {
  const page = await api.get<PaginatedResponse<SalonApiItem>>('/salons', {
    params: { page: 1, limit: 100, franchiseId },
  });
  return page.data.map((row) => ({
    id: row.id,
    name: row.name,
    franchiseId: row.franchiseId,
  }));
}
