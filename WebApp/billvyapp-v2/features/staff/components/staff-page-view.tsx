'use client';

import { useState } from 'react';
import { useAdminStaff } from '../hooks/use-staff';
import { StaffStats } from './staff-stats';
import { StaffFilters } from './staff-filters';
import { StaffTable } from './staff-table';
import { StaffSidebar } from './staff-sidebar';
import { CreateStaffDialog } from './create-staff-dialog';
import { StaffDetailsDialog } from './staff-details-dialog';
import type { StaffFilterState, StaffItem } from '../types/staff.types';

export function StaffPageView() {
  const [filters, setFilters] = useState<StaffFilterState>({
    search: '',
    statusTab: 'ALL',
    branchId: 'all',
    roleId: 'all',
    status: 'all',
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = useAdminStaff(filters);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<StaffItem | null>(null);

  const handleFiltersChange = (updated: Partial<StaffFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const staff = data?.staff || [];
  const stats = data?.stats || {
    totalStaff: 0,
    activeStaff: 0,
    activeStaffPct: 0,
    onLeave: 0,
    onLeavePct: 0,
    inactiveStaff: 0,
    inactiveStaffPct: 0,
    totalPayrollThisMonth: 0,
  };
  const roleDistribution = data?.roleDistribution || [];
  const branches = data?.branches || [];
  const roles = data?.roles || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Staff
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Manage your staff members and their roles across branches.
        </p>
      </div>

      {/* Top 5 Metric Cards */}
      <StaffStats stats={stats} loading={isLoading} />

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Section (Table & Filters) - 8 cols */}
        <div className="space-y-5 lg:col-span-8">
          <StaffFilters
            filters={filters}
            onChange={handleFiltersChange}
            branches={branches}
            roles={roles}
            onAddStaff={() => setIsCreateOpen(true)}
            onBulkActions={() => setIsCreateOpen(true)}
          />

          <StaffTable
            staff={staff}
            total={data?.total || 0}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            limit={filters.limit}
            loading={isLoading}
            onPageChange={(p) => handleFiltersChange({ page: p })}
            onLimitChange={(l) => handleFiltersChange({ limit: l, page: 1 })}
            onAddStaff={() => setIsCreateOpen(true)}
            onEditStaff={(m) => setViewingStaff(m)}
            onViewStaff={(m) => setViewingStaff(m)}
          />
        </div>

        {/* Right Section (Sidebar with Donut & Roles) - 4 cols */}
        <div className="lg:col-span-4">
          <StaffSidebar
            stats={stats}
            roleDistribution={roleDistribution}
            onAddStaff={() => setIsCreateOpen(true)}
            onBulkActions={() => setIsCreateOpen(true)}
            onAttendance={() => {
              // Quick filter or redirect
              handleFiltersChange({ statusTab: 'ACTIVE', page: 1 });
            }}
          />
        </div>
      </div>

      {/* Add Staff Modal */}
      <CreateStaffDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        branches={branches}
        roles={roles}
      />

      {/* Staff Details Modal */}
      <StaffDetailsDialog
        staff={viewingStaff}
        isOpen={!!viewingStaff}
        onClose={() => setViewingStaff(null)}
      />
    </div>
  );
}
