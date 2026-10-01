'use client';

import { SelectInput } from '@/components/data/form-fields';

import { Filter, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ServicesFilterState } from '../../types/admin-services.types';

type ServicesFiltersProps = {
  filters: ServicesFilterState;
  onFilterChange: (updates: Partial<ServicesFilterState>) => void;
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
};

export function AdminServicesFilters({
  filters,
  onFilterChange,
  categories,
  branches,
}: ServicesFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          placeholder="Search services..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
          className="w-full rounded-xl border border-border bg-surface pl-9 pr-3.5 py-2 text-sm text-text placeholder:text-text-muted focus:border-champagne focus:outline-none focus:ring-2 focus:ring-champagne"
        />
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Category dropdown */}
        <SelectInput className="app-select-sm h-8 w-auto min-w-0 text-xs font-medium"
          value={filters.categoryId}
          onChange={(e) => onFilterChange({ categoryId: e.target.value, page: 1 })}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectInput>

        {/* Branch dropdown */}
        <SelectInput className="app-select-sm h-8 w-auto min-w-0 text-xs font-medium"
          value={filters.branchId}
          onChange={(e) => onFilterChange({ branchId: e.target.value, page: 1 })}
          aria-label="Filter by branch"
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectInput>

        {/* Status dropdown */}
        <SelectInput className="app-select-sm h-8 w-auto min-w-0 text-xs font-medium"
          value={filters.status}
          onChange={(e) =>
            onFilterChange({
              status: e.target.value as ServicesFilterState['status'],
              page: 1,
            })
          }
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectInput>

        {/* Filter button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-border bg-surface text-text hover:bg-champagne-light/30"
          onClick={() => {
            onFilterChange({
              search: '',
              categoryId: 'all',
              branchId: 'all',
              status: 'all',
              page: 1,
            });
          }}
        >
          <Filter className="size-3.5 text-text-secondary" />
          Filter
        </Button>
      </div>
    </div>
  );
}
