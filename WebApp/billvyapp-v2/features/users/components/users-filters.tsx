'use client';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROLE_LABELS } from '@/constants/roles';
import { cn } from '@/lib/utils';
import type {
  FranchiseOption,
  RoleOption,
  UserStatusFilter,
} from '../types/users.types';

type UsersFiltersProps = {
  search: string;
  roleId: string;
  franchiseId: string;
  status: UserStatusFilter;
  roles: RoleOption[];
  franchises: FranchiseOption[];
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onFranchiseChange: (value: string) => void;
  onStatusChange: (value: UserStatusFilter) => void;
  onAddUser: () => void;
  className?: string;
};

const selectClassName =
  'h-11 rounded-lg border border-border bg-background px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne';

export function UsersFilters({
  search,
  roleId,
  franchiseId,
  status,
  roles,
  franchises,
  onSearchChange,
  onRoleChange,
  onFranchiseChange,
  onStatusChange,
  onAddUser,
  className,
}: UsersFiltersProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email or phone..."
            aria-label="Search users"
            className="h-11 bg-background pl-9"
          />
        </div>

        <select
          value={roleId}
          onChange={(e) => onRoleChange(e.target.value)}
          aria-label="Filter by role"
          className={selectClassName}
        >
          <option value="all">All Roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {ROLE_LABELS[role.code]}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as UserStatusFilter)}
          aria-label="Filter by status"
          className={selectClassName}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={franchiseId}
          onChange={(e) => onFranchiseChange(e.target.value)}
          aria-label="Filter by business"
          className={selectClassName}
        >
          <option value="all">All Businesses</option>
          {franchises.map((franchise) => (
            <option key={franchise.id} value={franchise.id}>
              {franchise.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onAddUser}
        className="h-11 gap-2 bg-brand-orange text-white hover:bg-brand-orange-deep focus-visible:ring-brand-orange"
      >
        <Plus className="size-4" aria-hidden />
        Add User
      </Button>
    </div>
  );
}
