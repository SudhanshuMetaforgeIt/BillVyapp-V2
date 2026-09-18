'use client';

import {
  ChevronDown,
  Filter,
  Plus,
  RotateCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomersFilterState } from '../../types/admin-customers.types';

type CustomersFiltersProps = {
  filters: CustomersFilterState;
  onChange: (updated: Partial<CustomersFilterState>) => void;
  branches: { id: string; name: string }[];
  onAddCustomer: () => void;
  onImportCustomers?: () => void;
  onRefresh?: () => void;
};

const TABS: Array<{ id: CustomersFilterState['customerTab']; label: string }> = [
  { id: 'ALL', label: 'All Customers' },
  { id: 'NEW', label: 'New Customers' },
  { id: 'RETURNING', label: 'Returning Customers' },
];

export function AdminCustomersFilters({
  filters,
  onChange,
  branches,
  onAddCustomer,
  onImportCustomers,
  onRefresh,
}: CustomersFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Tabs & Top Right Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        {/* Customer Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto text-sm">
          {TABS.map((tab) => {
            const isActive = filters.customerTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange({ customerTab: tab.id, page: 1 })}
                className={`relative whitespace-nowrap pb-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-stone-900 font-semibold dark:text-white'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onImportCustomers}
            className="flex items-center gap-2 border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 text-xs font-semibold h-9 px-3.5 rounded-lg"
          >
            <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Import Customers</span>
          </Button>

          <Button
            type="button"
            onClick={onAddCustomer}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xs text-xs font-semibold h-9 px-3.5 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Customer</span>
          </Button>
        </div>
      </div>

      {/* Filter Row: Search, Branch, Status, Gender, Filter, Refresh */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            placeholder="Search by name, mobile or email..."
            className="w-full rounded-lg border border-stone-200/80 bg-white py-2 pl-9 pr-8 text-xs text-stone-800 shadow-2xs placeholder:text-stone-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '', page: 1 })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Branch Selector */}
        <div className="relative">
          <select
            value={filters.branchId}
            onChange={(e) => onChange({ branchId: e.target.value, page: 1 })}
            className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        </div>

        {/* Status Selector */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) =>
              onChange({
                status: e.target.value as CustomersFilterState['status'],
                page: 1,
              })
            }
            className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        </div>

        {/* Gender Selector */}
        <div className="relative">
          <select
            value={filters.gender}
            onChange={(e) =>
              onChange({
                gender: e.target.value as CustomersFilterState['gender'],
                page: 1,
              })
            }
            className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none"
          >
            <option value="all">All Gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        </div>

        {/* Filter Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (
              filters.search ||
              filters.branchId !== 'all' ||
              filters.status !== 'all' ||
              filters.gender !== 'all'
            ) {
              onChange({
                search: '',
                branchId: 'all',
                status: 'all',
                gender: 'all',
                page: 1,
              });
            }
          }}
          className="flex items-center gap-1.5 h-9 rounded-lg border-stone-200/80 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
        >
          <Filter className="h-3.5 w-3.5 text-stone-500" />
          <span>Filter</span>
        </Button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh customers"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200/80 bg-white text-stone-600 shadow-2xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
