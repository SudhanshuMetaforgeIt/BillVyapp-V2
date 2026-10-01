'use client';

import { SelectInput } from '@/components/data/form-fields';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  MembershipStatusFilter,
  MembershipsTab,
} from '../types/memberships.types';

type MembershipsFiltersProps = {
  tab: MembershipsTab;
  search: string;
  onSearchChange: (value: string) => void;
  planId: string;
  onPlanIdChange: (value: string) => void;
  planOptions: Array<{ id: string; name: string }>;
  status: MembershipStatusFilter;
  onStatusChange: (value: MembershipStatusFilter) => void;
  onPrimaryAction: () => void;
};

export function MembershipsFilters({
  tab,
  search,
  onSearchChange,
  planId,
  onPlanIdChange,
  planOptions,
  status,
  onStatusChange,
  onPrimaryAction,
}: MembershipsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={
            tab === 'members'
              ? 'Search member name or mobile...'
              : 'Search plans by name...'
          }
          className="h-10 pr-9"
          aria-label={tab === 'members' ? 'Search members' : 'Search plans'}
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tab === 'members' ? (
          <>
            <SelectInput className="h-10 w-auto min-w-[9rem] text-sm font-medium"
              value={planId}
              onChange={(e) => onPlanIdChange(e.target.value)}
              aria-label="Membership plan filter"
            >
              <option value="">All Membership Plans</option>
              {planOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </SelectInput>

            <SelectInput className="h-10 w-auto min-w-[9rem] text-sm font-medium"
              value={status}
              onChange={(e) =>
                onStatusChange(e.target.value as MembershipStatusFilter)
              }
              aria-label="Status filter"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </SelectInput>
          </>
        ) : null}

        <Button
          type="button"
          className="h-10 bg-champagne text-white hover:bg-champagne/90"
          onClick={onPrimaryAction}
        >
          <Plus className="size-4" />
          {tab === 'members' ? 'Add Member' : 'Add Plan'}
        </Button>
      </div>
    </div>
  );
}
