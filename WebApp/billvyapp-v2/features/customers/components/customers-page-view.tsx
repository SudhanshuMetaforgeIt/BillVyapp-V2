'use client';

import { useState } from 'react';
import { useAdminCustomers } from '../hooks/use-customers';
import { CustomersStats } from './customers-stats';
import { CustomersFilters } from './customers-filters';
import { CustomersTable } from './customers-table';
import { CustomersSidebar } from './customers-sidebar';
import { CreateCustomerDialog } from './create-customer-dialog';
import { CustomerDetailsDialog } from './customer-details-dialog';
import type {
  CustomerItem,
  CustomersFilterState,
} from '../types/customers.types';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export function CustomersPageView() {
  const router = useRouter();

  const [filters, setFilters] = useState<CustomersFilterState>({
    search: '',
    customerTab: 'ALL',
    branchId: 'all',
    status: 'all',
    gender: 'all',
    page: 1,
    limit: 10,
  });

  const { data, isLoading, refetch } = useAdminCustomers(filters);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerItem | null>(null);

  const handleFiltersChange = (updated: Partial<CustomersFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const customers = data?.customers || [];
  const stats = data?.stats || {
    totalCustomers: 0,
    totalCustomersChange: 'No data yet',
    newCustomers: 0,
    newCustomersChange: 'No data yet',
    returningCustomers: 0,
    returningCustomersPct: 0,
    totalSpentThisMonth: 0,
    totalSpentChange: 'No data yet',
  };
  const insights = data?.insights || {
    mostFrequentCustomer: null,
    highestSpender: null,
    newThisMonth: 0,
    inactiveCustomers: 0,
  };
  const branches = data?.branches || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Customers
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Manage your customers and their details across all branches.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <CustomersStats stats={stats} loading={isLoading} />

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Section (Table & Filters) - 8 cols */}
        <div className="space-y-5 lg:col-span-8">
          <CustomersFilters
            filters={filters}
            onChange={handleFiltersChange}
            branches={branches}
            onAddCustomer={() => setIsCreateOpen(true)}
            onImportCustomers={() => setIsCreateOpen(true)}
            onRefresh={() => refetch()}
          />

          <CustomersTable
            customers={customers}
            total={data?.total || 0}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            limit={filters.limit}
            loading={isLoading}
            onPageChange={(p) => handleFiltersChange({ page: p })}
            onLimitChange={(l) => handleFiltersChange({ limit: l, page: 1 })}
            onAddCustomer={() => setIsCreateOpen(true)}
            onViewCustomer={(c) => setViewingCustomer(c)}
            onViewCustomerBills={() => {
              router.push(ROUTES.dashboard.admin.bills);
            }}
          />
        </div>

        {/* Right Section (Customer Insights & Quick Actions) - 4 cols */}
        <div className="lg:col-span-4">
          <CustomersSidebar
            insights={insights}
            onAddCustomer={() => setIsCreateOpen(true)}
            onImportCustomers={() => setIsCreateOpen(true)}
            onDownloadCustomers={() => {
              window.print();
            }}
          />
        </div>
      </div>

      {/* Add Customer Modal */}
      <CreateCustomerDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        branches={branches}
      />

      {/* View Customer Details Modal */}
      <CustomerDetailsDialog
        customer={viewingCustomer}
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
      />
    </div>
  );
}
