export type AdminReportStats = {
  totalRevenue: number;
  totalRevenueChange: string;
  totalBills: number;
  totalBillsChange: string;
  totalCustomers: number;
  totalCustomersChange: string;
  totalServices: number;
  totalServicesChange: string;
  totalStaff: number;
  totalStaffChange: string;
};

export type RevenuePoint = {
  date: string;
  revenue: number;
};

export type BillsOverviewSummary = {
  total: number;
  paid: number;
  paidPct: number;
  pending: number;
  pendingPct: number;
  overdue: number;
  overduePct: number;
  cancelled: number;
  cancelledPct: number;
};

export type BranchComparisonItem = {
  id: string;
  name: string;
  revenue: number;
  growth: string;
  positive: boolean;
};

export type RevenueByBranchItem = {
  branchName: string;
  revenue: number;
};

export type TopServiceByRevenueItem = {
  id: string;
  name: string;
  revenue: number;
};

export type TopServiceByQuantityItem = {
  name: string;
  quantity: number;
};

export type AdminReportsFilterState = {
  dateFrom?: string;
  dateTo?: string;
  branchId: string;
  reportType: string;
};

export type AdminReportsData = {
  stats: AdminReportStats;
  revenueSeries: RevenuePoint[];
  billsOverview: BillsOverviewSummary;
  branchComparison: BranchComparisonItem[];
  revenueByBranch: RevenueByBranchItem[];
  topServicesByRevenue: TopServiceByRevenueItem[];
  topServicesByQuantity: TopServiceByQuantityItem[];
  branches: { id: string; name: string }[];
};
