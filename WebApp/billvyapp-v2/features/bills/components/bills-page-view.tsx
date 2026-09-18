'use client';

import { useState } from 'react';
import { useAdminBills, useUpdateBillStatus } from '../hooks/use-bills';
import { BillsStats } from './bills-stats';
import { BillsFilters } from './bills-filters';
import { BillsTable } from './bills-table';
import { BillsSidebar } from './bills-sidebar';
import { CreateBillDialog } from './create-bill-dialog';
import { BillDetailsDialog } from './bill-details-dialog';
import type { BillRowItem, BillsFilterState, BillStatus } from '../types/bills.types';

export function BillsPageView() {
  const [filters, setFilters] = useState<BillsFilterState>({
    search: '',
    statusTab: 'ALL',
    status: 'all',
    branchId: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = useAdminBills(filters);
  const updateStatusMutation = useUpdateBillStatus();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<BillRowItem | null>(null);

  const handleFiltersChange = (updated: Partial<BillsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdateStatus = (billId: string, status: BillStatus) => {
    updateStatusMutation.mutate({ billId, status });
  };

  const bills = data?.bills || [];
  const stats = data?.stats || {
    totalBills: 0,
    totalBillsChange: 'No data yet',
    paidBills: 0,
    paidBillsPct: 0,
    pendingBills: 0,
    pendingBillsPct: 0,
    overdueBills: 0,
    overdueBillsPct: 0,
    totalAmount: 0,
    totalAmountChange: 'No data yet',
  };
  const amountSummary = data?.amountSummary || {
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    cancelledAmount: 0,
  };
  const branches = data?.branches || [];
  const customers = data?.customers || [];
  const services = data?.services || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Bills
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Create, manage and track all your bills across branches.
        </p>
      </div>

      {/* Top 5 Metric Cards */}
      <BillsStats stats={stats} loading={isLoading} />

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Section (Table & Filters) - 8 cols */}
        <div className="space-y-5 lg:col-span-8">
          <BillsFilters
            filters={filters}
            onChange={handleFiltersChange}
            branches={branches}
            onCreateBill={() => setIsCreateOpen(true)}
            onBulkUpload={() => setIsCreateOpen(true)}
          />

          <BillsTable
            bills={bills}
            total={data?.total || 0}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            limit={filters.limit}
            loading={isLoading}
            onPageChange={(p) => handleFiltersChange({ page: p })}
            onLimitChange={(l) => handleFiltersChange({ limit: l, page: 1 })}
            onCreateBill={() => setIsCreateOpen(true)}
            onViewBill={(b) => setViewingBill(b)}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>

        {/* Right Section (Summary & Actions Sidebar) - 4 cols */}
        <div className="lg:col-span-4">
          <BillsSidebar
            stats={stats}
            amountSummary={amountSummary}
            onCreateBill={() => setIsCreateOpen(true)}
            onBulkUpload={() => setIsCreateOpen(true)}
            onDownloadReports={() => {
              window.print();
            }}
            onViewPayments={() => {
              handleFiltersChange({ statusTab: 'PAID', page: 1 });
            }}
          />
        </div>
      </div>

      {/* Create Bill Modal */}
      <CreateBillDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        branches={branches}
        customers={customers}
        services={services}
      />

      {/* View Bill Details Modal */}
      <BillDetailsDialog
        bill={viewingBill}
        isOpen={!!viewingBill}
        onClose={() => setViewingBill(null)}
      />
    </div>
  );
}
