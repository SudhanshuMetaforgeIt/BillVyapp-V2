'use client';

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
  onPrimaryAction: () => void;
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
          <select
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            aria-label="Category filter"
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        ) : null}

        <select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as ServiceStatusFilter)
          }
          aria-label="Status filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <Button
          type="button"
          className="h-10 bg-champagne text-white hover:bg-champagne/90"
          onClick={onPrimaryAction}
        >
          <Plus className="size-4" />
          {tab === 'services' ? 'Add New Service' : 'Add Category'}
        </Button>
      </div>
    </div>
  );
}
