import { format, parseISO } from 'date-fns';
import { api } from '@/services/api-client';
import type {
  AdminStaffResult,
  CreateStaffPayload,
  StaffFilterState,
  StaffItem,
  StaffRoleDistributionItem,
  StaffStats,
  StaffStatus,
} from '../types/staff.types';

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RawUser = {
  id: string;
  roleId: string;
  franchiseId?: string | null;
  salonId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  profilePhoto?: string | null;
  isActive: boolean;
  role: {
    id: string;
    name: string;
    code: string;
  };
  salon?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type RawSalon = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type RawRole = {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
};

// Map role codes to attractive styling & designations
const ROLE_NAME_MAP: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Salon Manager',
  STAFF: 'Senior Stylist',
};

const SALARY_MAP: Record<string, number> = {
  MANAGER: 35000,
  STAFF: 28000,
  ADMIN: 40000,
  SUPER_ADMIN: 50000,
};

export async function fetchAdminStaff(
  filters: Partial<StaffFilterState> = {},
): Promise<AdminStaffResult> {
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

  if (filters.roleId && filters.roleId !== 'all') {
    params.roleId = filters.roleId;
  }

  if (filters.status === 'ACTIVE') {
    params.isActive = true;
  } else if (filters.status === 'INACTIVE') {
    params.isActive = false;
  }

  const [usersRes, allUsersRes, salonsRes, rolesRes] =
    await Promise.allSettled([
      api.get<PaginatedResponse<RawUser>>('/users', { params }),
      api.get<PaginatedResponse<RawUser>>('/users', {
        params: { page: 1, limit: 100 },
      }),
      api.get<PaginatedResponse<RawSalon>>('/salons', {
        params: { page: 1, limit: 100 },
      }),
      api.get<RawRole[]>('/roles'),
    ]);

  const getArray = <T>(res: PromiseSettledResult<unknown>): T[] => {
    if (res.status === 'fulfilled' && res.value) {
      if (typeof res.value === 'object' && 'data' in res.value && Array.isArray((res.value as { data: unknown }).data)) {
        return (res.value as { data: T[] }).data;
      }
      if (Array.isArray(res.value)) {
        return res.value as T[];
      }
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

  const rawUsers = getArray<RawUser>(usersRes);
  const meta = getMeta(usersRes);
  const allUsers = getArray<RawUser>(allUsersRes);
  const rawSalons = getArray<RawSalon>(salonsRes);
  const rawRoles = getArray<RawRole>(rolesRes);

  const salonMap = new Map(rawSalons.map((s) => [s.id, s.name]));

  // Map to StaffItem
  const staffList: StaffItem[] = rawUsers.map((u, idx) => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff Member';
    const shortCode = `ST${String(idx + 1).padStart(3, '0')}`;
    const branchName = u.salon?.name || (u.salonId ? salonMap.get(u.salonId) : null) || 'All Branches';
    const roleName = ROLE_NAME_MAP[u.role?.code] || u.role?.name || 'Staff Member';
    const salary = SALARY_MAP[u.role?.code] || 25000;

    let formattedJoin = '—';
    try {
      const d = parseISO(u.createdAt);
      if (!isNaN(d.getTime())) {
        formattedJoin = format(d, 'dd MMM, yyyy');
      }
    } catch {
      formattedJoin = u.createdAt;
    }

    const status: StaffStatus = u.isActive ? 'ACTIVE' : 'INACTIVE';

    return {
      id: u.id,
      name: fullName,
      firstName: u.firstName,
      lastName: u.lastName,
      staffCode: shortCode,
      roleName,
      roleCode: u.role?.code || 'STAFF',
      branchName,
      salonId: u.salonId,
      phone: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : '—',
      email: u.email,
      salary,
      status,
      joinDate: formattedJoin,
      profilePhoto: u.profilePhoto,
      createdAt: u.createdAt,
    };
  });

  // Filter based on statusTab
  let displayStaff = staffList;
  if (filters.statusTab === 'ACTIVE') {
    displayStaff = staffList.filter((s) => s.status === 'ACTIVE');
  } else if (filters.statusTab === 'ON_LEAVE') {
    displayStaff = staffList.filter((s) => s.status === 'ON_LEAVE');
  } else if (filters.statusTab === 'INACTIVE') {
    displayStaff = staffList.filter((s) => s.status === 'INACTIVE');
  }

  // Calculate Metrics from allUsers
  const totalStaffCount = meta.total || allUsers.length;
  let activeCount = 0;
  let inactiveCount = 0;
  let totalPayroll = 0;

  const roleCounts: Record<string, number> = {};

  for (const u of allUsers) {
    const roleName = ROLE_NAME_MAP[u.role?.code] || u.role?.name || 'Other';
    roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;

    if (u.isActive) {
      activeCount++;
      totalPayroll += SALARY_MAP[u.role?.code] || 25000;
    } else {
      inactiveCount++;
    }
  }

  // Placeholder for onLeave (can be 0 or derived)
  const onLeaveCount = 0;

  const calcPct = (cnt: number, tot: number) =>
    tot > 0 ? Number(((cnt / tot) * 100).toFixed(1)) : 0;

  const stats: StaffStats = {
    totalStaff: totalStaffCount,
    activeStaff: activeCount,
    activeStaffPct: calcPct(activeCount, totalStaffCount),
    onLeave: onLeaveCount,
    onLeavePct: calcPct(onLeaveCount, totalStaffCount),
    inactiveStaff: inactiveCount,
    inactiveStaffPct: calcPct(inactiveCount, totalStaffCount),
    totalPayrollThisMonth: totalPayroll,
  };

  const roleDistribution: StaffRoleDistributionItem[] = Object.entries(
    roleCounts,
  ).map(([roleName, count]) => ({
    roleName,
    count,
  }));

  const branches = rawSalons.map((s) => ({ id: s.id, name: s.name }));
  const roles = rawRoles.map((r) => ({ id: r.id, name: r.name, code: r.code }));

  return {
    staff: displayStaff,
    stats,
    roleDistribution,
    total: meta.total,
    totalPages: Math.max(1, meta.totalPages),
    branches,
    roles,
  };
}

export async function createStaff(
  payload: CreateStaffPayload,
): Promise<RawUser> {
  const body: Record<string, unknown> = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim().replace(/^\+91/, '').replace(/\D/g, ''),
    password: payload.password || 'Staff@1234',
    roleId: payload.roleId,
  };

  if (payload.salonId && payload.salonId !== 'all') {
    body.salonId = payload.salonId;
  }

  return api.post<RawUser>('/users', body);
}
