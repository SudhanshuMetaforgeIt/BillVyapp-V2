export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';

export type StaffStats = {
  totalStaff: number;
  activeStaff: number;
  activeStaffPct: number;
  onLeave: number;
  onLeavePct: number;
  inactiveStaff: number;
  inactiveStaffPct: number;
  totalPayrollThisMonth: number;
};

export type StaffRoleDistributionItem = {
  roleName: string;
  count: number;
};

export type StaffItem = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  staffCode: string;
  roleName: string;
  roleCode: string;
  branchName: string;
  salonId?: string | null;
  phone: string;
  email: string;
  salary: number;
  status: StaffStatus;
  joinDate: string;
  profilePhoto?: string | null;
  createdAt: string;
};

export type StaffFilterState = {
  search: string;
  statusTab: 'ALL' | 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  branchId: string;
  roleId: string;
  status: 'all' | StaffStatus;
  page: number;
  limit: number;
};

export type CreateStaffPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  roleId: string;
  salonId?: string;
  designation?: string;
  salary?: number;
};

export type AdminStaffResult = {
  staff: StaffItem[];
  stats: StaffStats;
  roleDistribution: StaffRoleDistributionItem[];
  total: number;
  totalPages: number;
  branches: { id: string; name: string }[];
  roles: { id: string; name: string; code: string }[];
};
