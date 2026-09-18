'use client';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  CustomerGender,
  CustomerStatusFilter,
} from '../types/customers.types';

type CustomersFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  membershipPlanId: string;
  onMembershipPlanIdChange: (value: string) => void;
  planOptions: Array<{ id: string; name: string }>;
  gender: '' | CustomerGender;
  onGenderChange: (value: '' | CustomerGender) => void;
  status: CustomerStatusFilter;
  onStatusChange: (value: CustomerStatusFilter) => void;
  onAddCustomer: () => void;
};

export function CustomersFilters({
  search,
  onSearchChange,
  membershipPlanId,
  onMembershipPlanIdChange,
  planOptions,
  gender,
  onGenderChange,
  status,
  onStatusChange,
  onAddCustomer,
}: CustomersFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Name, Mobile or Email"
          className="h-10 pr-9"
          aria-label="Search customers"
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={membershipPlanId}
          onChange={(e) => onMembershipPlanIdChange(e.target.value)}
          aria-label="Membership filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="">All Memberships</option>
          {planOptions.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>

        <select
          value={gender}
          onChange={(e) =>
            onGenderChange(e.target.value as '' | CustomerGender)
          }
          aria-label="Gender filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="">All Genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </select>

        <select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as CustomerStatusFilter)
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
          onClick={onAddCustomer}
        >
          <Plus className="size-4" />
          Add New Customer
        </Button>
      </div>
    </div>
  );
}
