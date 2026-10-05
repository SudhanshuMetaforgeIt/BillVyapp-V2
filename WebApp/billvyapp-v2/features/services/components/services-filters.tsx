'use client';

import { SelectInput } from '@/components/data/form-fields';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  ServiceStatusFilter,
  ServicesTab,
} from '../types/services.types';

type ServicesFiltersProps = {
  tab: ServicesTab;
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  categoryOptions: Array<{ id: string; name: string }>;
  status: ServiceStatusFilter;
  onStatusChange: (value: ServiceStatusFilter) => void;
  onPrimaryAction?: () => void;
};

export function ServicesFilters({
  tab,
  search,
  onSearchChange,
  categoryId,
  onCategoryIdChange,
  categoryOptions,
  status,
  onStatusChange,
  onPrimaryAction,
}: ServicesFiltersProps) {
  return (
    <div className="app-toolbar">
      <div className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            tab === 'services' ? 'Search services...' : 'Search categories...'
          }
          className="h-10 pr-9"
          aria-label={tab === 'services' ? 'Search services' : 'Search categories'}
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tab === 'services' ? (
          <SelectInput className="h-10 w-full min-w-0 sm:w-auto sm:min-w-[9rem] text-sm font-medium"
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            aria-label="Category filter"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </SelectInput>
        ) : null}

        <SelectInput className="h-10 w-full min-w-0 sm:w-auto sm:min-w-[9rem] text-sm font-medium"
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as ServiceStatusFilter)
          }
          aria-label="Status filter"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectInput>

        {onPrimaryAction ? (
          <Button
            type="button"
            className="h-10 bg-champagne text-white hover:bg-champagne/90"
            onClick={onPrimaryAction}
          >
            <Plus className="size-4" />
            {tab === 'services' ? 'Add New Service' : 'Add Category'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
