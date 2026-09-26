export type AdminBusinessStats = {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  totalStaff: number;
  revenueMonth: number;
  /** True when revenueMonth was summed from a truncated page of payments. */
  revenueMonthPartial: boolean;
};

export type AdminFranchiseOverview = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessSince: string;
  isActive: boolean;
};

export type AdminBranchItem = {
  id: string;
  name: string;
  location: string;
  code: string;
  /** null when the staff list is too large to attribute from one page. */
  managerName: string | null;
  managerPhone: string | null;
  managerInitials: string;
  status: 'active' | 'inactive';
  staffCount: number | null;
  /** null when this month's bills are too many to attribute from one page. */
  revenueMonth: number | null;
  photoUrl?: string | null;
};

export type AdminOverviewAllBranches = {
  totalCustomers: number;
  totalServices: number;
  totalBillsMonth: number;
  totalProducts: number;
};

export type AdminMyBusinessData = {
  stats: AdminBusinessStats;
  franchise: AdminFranchiseOverview;
  branches: AdminBranchItem[];
  overview: AdminOverviewAllBranches;
};
