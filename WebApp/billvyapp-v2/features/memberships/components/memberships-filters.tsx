'use client';

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
            <select
              value={planId}
              onChange={(e) => onPlanIdChange(e.target.value)}
              aria-label="Membership plan filter"
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <option value="">All Membership Plans</option>
              {planOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) =>
                onStatusChange(e.target.value as MembershipStatusFilter)
              }
              aria-label="Status filter"
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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
