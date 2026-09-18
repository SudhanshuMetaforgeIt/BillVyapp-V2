'use client';

import { MoreVertical } from 'lucide-react';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatDateTime } from '@/lib/format';
import type { RoleCode } from '@/constants/roles';
import type { PaginationMeta, UserListRow } from '../types/users.types';
import { useUpdateUserStatus } from '../hooks/use-update-user-status';
import { UsersPagination } from './users-pagination';

type UsersTableProps = {
  rows: UserListRow[];
  meta: PaginationMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPageChange: (page: number) => void;
};

function roleTone(
  code: RoleCode,
): 'accent' | 'info' | 'success' | 'neutral' | 'warning' {
  if (code === 'SUPER_ADMIN') return 'accent';
  if (code === 'ADMIN') return 'warning';
  if (code === 'MANAGER') return 'success';
  if (code === 'STAFF') return 'info';
  return 'neutral';
}

export function UsersTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
}: UsersTableProps) {
  const statusMutation = useUpdateUserStatus();

  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load users. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title="No users found"
          message="Try adjusting your search or filters, or add a new user."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Business</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Last Login</th>
                  <th className="px-5 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-ivory/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                          {row.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-text">
                            {row.fullName}
                          </p>
                          {row.salonName ? (
                            <p className="truncate text-xs text-text-secondary">
                              {row.salonName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      <span className="truncate">{row.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.roleLabel}
                        tone={roleTone(row.roleCode)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {row.businessName}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={row.statusLabel}
                        tone={row.isActive ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary">
                      {row.lastLoginAt
                        ? formatDateTime(row.lastLoginAt)
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={statusMutation.isPending}
                          className="h-8 border-brand-orange text-brand-orange hover:bg-brand-orange/5"
                          onClick={() =>
                            statusMutation.mutate({
                              id: row.id,
                              isActive: !row.isActive,
                              name: row.fullName,
                            })
                          }
                        >
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                          aria-label={`More actions for ${row.fullName}`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {rows.map((row) => (
              <li key={row.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                      {row.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">
                        {row.fullName}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.email}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    label={row.statusLabel}
                    tone={row.isActive ? 'success' : 'danger'}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  <StatusBadge
                    label={row.roleLabel}
                    tone={roleTone(row.roleCode)}
                  />
                  <span className="text-xs text-text-secondary">
                    {row.businessName}
                  </span>
                  <span className="text-xs text-text-secondary">
                    Joined {formatDate(row.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <UsersPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
