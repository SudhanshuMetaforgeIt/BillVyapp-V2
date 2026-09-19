'use client';

import {
  Calendar,
  ChevronDown,
  Filter,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BillsFilterState } from '../types/bills.types';

type BillsFiltersProps = {
  filters: BillsFilterState;
  onChange: (updated: Partial<BillsFilterState>) => void;
  branches: { id: string; name: string }[];
  onCreateBill: () => void;
  onBulkUpload?: () => void;
};

const STATUS_TABS: Array<{
  id: BillsFilterState['statusTab'];
  label: string;
}> = [
  { id: 'ALL', label: 'All Bills' },
  { id: 'PAID', label: 'Paid' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function BillsFilters({
  filters,
  onChange,
  branches,
  onCreateBill,
  onBulkUpload,
}: BillsFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Top Tab Bar & Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        {/* Status Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto text-sm">
          {STATUS_TABS.map((tab) => {
            const isActive = filters.statusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange({ statusTab: tab.id, page: 1 })}
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

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBulkUpload}
            className="flex items-center gap-2 border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 text-xs font-semibold h-9 px-3.5 rounded-lg"
          >
            <Upload className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Bulk Upload Bills</span>
          </Button>

          <Button
            type="button"
            onClick={onCreateBill}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xs text-xs font-semibold h-9 px-3.5 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Bill</span>
            <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-80" />
          </Button>
        </div>
      </div>

      {/* Filter Row: Search, Date Picker, Branch, Status, Filter button */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            placeholder="Search by bill no., customer or mobile..."
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

        {/* Date Range Selector */}
        <div className="relative flex items-center gap-2 rounded-lg border border-stone-200/80 bg-white px-3 py-2 text-xs text-stone-700 shadow-2xs dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
          <Calendar className="h-3.5 w-3.5 text-stone-400" />
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onChange({ dateFrom: e.target.value || undefined, page: 1 })}
            className="border-none bg-transparent p-0 text-xs focus:outline-hidden"
            title="Date from"
          />
          <span className="text-stone-400">—</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onChange({ dateTo: e.target.value || undefined, page: 1 })}
            className="border-none bg-transparent p-0 text-xs focus:outline-hidden"
            title="Date to"
          />
          {(filters.dateFrom || filters.dateTo) && (
            <button
              type="button"
              onClick={() => onChange({ dateFrom: undefined, dateTo: undefined, page: 1 })}
              className="ml-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              title="Clear date range"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Branch selector */}
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

        {/* Status selector */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value, page: 1 })}
            className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        </div>

        {/* Filter button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Reset to defaults if needed or apply
            if (filters.search || filters.branchId !== 'all' || filters.status !== 'all' || filters.dateFrom || filters.dateTo) {
              onChange({ search: '', branchId: 'all', status: 'all', dateFrom: undefined, dateTo: undefined, page: 1 });
            }
          }}
          className="flex items-center gap-1.5 h-9 rounded-lg border-stone-200/80 bg-white px-3 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
        >
          <Filter className="h-3.5 w-3.5 text-stone-500" />
          <span>Filter</span>
        </Button>
      </div>
    </div>
  );
}
