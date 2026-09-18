export type AdminBusinessStats = {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  totalStaff: number;
  revenueMonth: number;
};

export type AdminFranchiseOverview = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessSince: string;
  subscriptionPlan: string;
  planValidTill: string;
};

export type AdminBranchItem = {
  id: string;
  name: string;
  location: string;
  code: string;
  isMain: boolean;
  managerName: string;
  managerPhone: string;
  managerInitials: string;
  status: 'active' | 'inactive';
  staffCount: number;
  revenueMonth: number;
  photoUrl?: string | null;
};

export type AdminOverviewAllBranches = {
  totalCustomers: number;
  totalServices: number;
  totalBillsMonth: number;
  totalProducts: number;
  totalCampaigns: number;
};

export type AdminMyBusinessData = {
  stats: AdminBusinessStats;
  franchise: AdminFranchiseOverview;
  branches: AdminBranchItem[];
  overview: AdminOverviewAllBranches;
};
