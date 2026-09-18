'use client';

import { useState } from 'react';
import { useAdminReports } from '../../hooks/use-admin-reports';
import { AdminReportsStats } from './admin-reports-stats';
import { AdminReportsFilters } from './admin-reports-filters';
import { RevenueOverviewChart } from './revenue-overview-chart';
import { BillsOverviewDonut } from './bills-overview-donut';
import { BranchComparisonCard } from './branch-comparison-card';
import { RevenueByBranchBarChart } from './revenue-by-branch-bar-chart';
import { TopServicesCard } from './top-services-card';
import { TopServicesByQuantityCard } from './top-services-by-quantity-card';
import { ReportsQuickActions } from './reports-quick-actions';
import type { AdminReportsFilterState } from '../../types/admin-reports.types';

export function AdminReportsPageView() {
  const [filters, setFilters] = useState<AdminReportsFilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    branchId: 'all',
    reportType: 'overview',
  });

  const { data, isLoading } = useAdminReports(filters);

  const handleFiltersChange = (updated: Partial<AdminReportsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const stats = data?.stats || {
    totalRevenue: 0,
    totalRevenueChange: 'No data yet',
    totalBills: 0,
    totalBillsChange: 'No data yet',
    totalCustomers: 0,
    totalCustomersChange: 'No data yet',
    totalServices: 0,
    totalServicesChange: 'No data yet',
    totalStaff: 0,
    totalStaffChange: 'No data yet',
  };

  const revenueSeries = data?.revenueSeries || [];
  const billsOverview = data?.billsOverview || {
    total: 0,
    paid: 0,
    paidPct: 0,
    pending: 0,
    pendingPct: 0,
    overdue: 0,
    overduePct: 0,
    cancelled: 0,
    cancelledPct: 0,
  };
  const branchComparison = data?.branchComparison || [];
  const revenueByBranch = data?.revenueByBranch || [];
  const topServicesByRevenue = data?.topServicesByRevenue || [];
  const topServicesByQuantity = data?.topServicesByQuantity || [];
  const branches = data?.branches || [];

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Reports
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Track your business performance and insights across all branches.
        </p>
      </div>

      {/* Top 5 Metric Cards */}
      <AdminReportsStats stats={stats} loading={isLoading} />

      {/* Filter Controls Bar */}
      <AdminReportsFilters
        filters={filters}
        onChange={handleFiltersChange}
        branches={branches}
        onDownloadReport={handleDownloadReport}
      />

      {/* Upper Grid (Row 1): Revenue Overview (6 cols), Bills Overview (3 cols), Branch Comparison (3 cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <RevenueOverviewChart series={revenueSeries} />
        </div>
        <div className="lg:col-span-3 sm:col-span-6">
          <BillsOverviewDonut summary={billsOverview} />
        </div>
        <div className="lg:col-span-3 sm:col-span-6">
          <BranchComparisonCard items={branchComparison} />
        </div>
      </div>

      {/* Lower Grid (Row 2): Revenue by Branch (5 cols), Top Services (4 cols), Right Stack (3 cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <RevenueByBranchBarChart items={revenueByBranch} />
        </div>
        <div className="lg:col-span-4">
          <TopServicesCard services={topServicesByRevenue} />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <TopServicesByQuantityCard items={topServicesByQuantity} />
          <ReportsQuickActions />
        </div>
      </div>
    </div>
  );
}
