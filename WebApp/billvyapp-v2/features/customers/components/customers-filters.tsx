'use client';

import { SelectInput } from '@/components/data/form-fields';

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
    <div className="app-toolbar">
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
        <SelectInput className="h-10 w-full min-w-0 sm:w-auto sm:min-w-[9rem] text-sm font-medium"
          value={membershipPlanId}
          onChange={(e) => onMembershipPlanIdChange(e.target.value)}
          aria-label="Membership filter"
        >
          <option value="">All Memberships</option>
          {planOptions.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </SelectInput>

        <SelectInput className="h-10 w-full min-w-0 sm:w-auto sm:min-w-[9rem] text-sm font-medium"
          value={gender}
          onChange={(e) =>
            onGenderChange(e.target.value as '' | CustomerGender)
          }
          aria-label="Gender filter"
        >
          <option value="">All Genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </SelectInput>

        <SelectInput className="h-10 w-full min-w-0 sm:w-auto sm:min-w-[9rem] text-sm font-medium"
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as CustomerStatusFilter)
          }
          aria-label="Status filter"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectInput>

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
