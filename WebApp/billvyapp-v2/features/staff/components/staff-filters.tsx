'use client';

import {
  ChevronDown,
  Filter,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StaffFilterState } from '../types/staff.types';

type StaffFiltersProps = {
  filters: StaffFilterState;
  onChange: (updated: Partial<StaffFilterState>) => void;
  branches: { id: string; name: string }[];
  roles: { id: string; name: string; code: string }[];
  onAddStaff: () => void;
  onBulkActions?: () => void;
};

const TABS: Array<{ id: StaffFilterState['statusTab']; label: string }> = [
  { id: 'ALL', label: 'All Staff' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'ON_LEAVE', label: 'On Leave' },
  { id: 'INACTIVE', label: 'Inactive' },
];

export function StaffFilters({
  filters,
  onChange,
  branches,
  roles,
  onAddStaff,
  onBulkActions,
}: StaffFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Tabs & Top Right Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        {/* Status Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto text-sm">
          {TABS.map((tab) => {
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBulkActions}
            className="flex items-center gap-1.5 border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 text-xs font-semibold h-9 px-3.5 rounded-lg"
          >
            <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Bulk Actions</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>

          <Button
            type="button"
            onClick={onAddStaff}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-xs text-xs font-semibold h-9 px-3.5 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Staff</span>
          </Button>
        </div>
      </div>

      {/* Filter Row: Search, Branch, Role, Status, Filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            placeholder="Search by name, mobile or role..."
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

        {/* Role Selector */}
        <div className="relative">
          <select
            value={filters.roleId}
            onChange={(e) => onChange({ roleId: e.target.value, page: 1 })}
            className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
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
                status: e.target.value as StaffFilterState['status'],
                page: 1,
              })
            }
            className="h-9 rounded-lg border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
        </div>

        {/* Filter Reset Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (
              filters.search ||
              filters.branchId !== 'all' ||
              filters.roleId !== 'all' ||
              filters.status !== 'all'
            ) {
              onChange({
                search: '',
                branchId: 'all',
                roleId: 'all',
                status: 'all',
                page: 1,
              });
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
