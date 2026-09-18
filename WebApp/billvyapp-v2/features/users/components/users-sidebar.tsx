'use client';

import { Plus, Shield } from 'lucide-react';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserRoleSlice } from '../types/users.types';
import { UsersRoleDonut } from './users-role-donut';

type UsersSidebarProps = {
  totalCount: number;
  roleSummary: UserRoleSlice[];
  isLoading?: boolean;
  onAddUser: () => void;
};

export function UsersSidebar({
  totalCount,
  roleSummary,
  isLoading,
  onAddUser,
}: UsersSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Role Distribution"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <UsersRoleDonut total={totalCount} slices={roleSummary} />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Quick Actions"
        data-dash-animate="section"
        bodyClassName="space-y-2 p-3"
      >
        <button
          type="button"
          onClick={onAddUser}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
            <Plus className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block">Add User</span>
            <span className="block text-xs font-normal text-text-secondary">
              Create a platform account
            </span>
          </span>
        </button>

        <div className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text-secondary">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-text-secondary">
            <Shield className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-text">Roles are fixed</span>
            <span className="block text-xs font-normal">
              Platform roles cannot be edited here
            </span>
          </span>
        </div>
      </DashboardSectionCard>
    </div>
  );
}
