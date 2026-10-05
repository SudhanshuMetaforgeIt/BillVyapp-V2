'use client';

import { SelectInput } from '@/components/data/form-fields';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PlanStatusFilter } from '../types/plans.types';

type PlansFiltersProps = {
  search: string;
  status: PlanStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PlanStatusFilter) => void;
  onAddPlan: () => void;
  className?: string;
};

const selectClassName =
  'h-11 w-full min-w-0 sm:w-auto sm:min-w-[9rem] text-sm font-medium';

export function PlansFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onAddPlan,
  className,
}: PlansFiltersProps) {
  return (
    <div
      className={cn(
        'app-toolbar lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search plan name..."
            aria-label="Search plans"
            className="h-11 bg-background pl-9"
          />
        </div>

        <SelectInput
          value={status}
          onChange={(e) => onStatusChange(e.target.value as PlanStatusFilter)}
          aria-label="Filter by status"
          className={selectClassName}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectInput>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onAddPlan}
        className="h-11 gap-2 bg-brand-orange text-white hover:bg-brand-orange-deep focus-visible:ring-brand-orange"
      >
        <Plus className="size-4" aria-hidden />
        Add New Plan
      </Button>
    </div>
  );
}
