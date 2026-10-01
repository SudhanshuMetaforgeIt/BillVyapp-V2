'use client';

import { Eye, UserCheck, UserX } from 'lucide-react';

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
  onViewUser: (user: UserListRow) => void;
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

/** Compact role names for dense table badges (full labels stay in details). */
function tableRoleLabel(code: RoleCode): string {
  if (code === 'SUPER_ADMIN') return 'Super Admin';
  if (code === 'ADMIN') return 'Admin';
  if (code === 'MANAGER') return 'Manager';
  if (code === 'STAFF') return 'Staff';
  return 'Customer';
}

export function UsersTable({
  rows,
  meta,
  isLoading,
  isError,
  onRetry,
  onPageChange,
  onViewUser,
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
          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-border bg-ivory/80 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="w-[20%] px-4 py-3 font-semibold">User</th>
                  <th className="w-[20%] px-4 py-3 font-semibold">Email</th>
                  <th className="w-[12%] px-4 py-3 font-semibold">Role</th>
                  <th className="w-[16%] px-4 py-3 font-semibold">Business</th>
                  <th className="w-[10%] px-4 py-3 font-semibold">Status</th>
                  <th className="w-[14%] px-4 py-3 font-semibold">Last Login</th>
                  <th className="w-[8%] px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-ivory/60"
                    onClick={() => onViewUser(row)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
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
                    <td className="px-4 py-3.5 text-text-secondary">
                      <span className="block truncate" title={row.email}>
                        {row.email}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label={tableRoleLabel(row.roleCode)}
                        tone={roleTone(row.roleCode)}
                        className="whitespace-nowrap"
                        title={row.roleLabel}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      <span
                        className="block truncate"
                        title={row.businessName}
                      >
                        {row.businessName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label={row.statusLabel}
                        tone={row.isActive ? 'success' : 'danger'}
                        className="whitespace-nowrap"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      <span
                        className="block whitespace-nowrap"
                        title={
                          row.lastLoginAt
                            ? formatDateTime(row.lastLoginAt)
                            : undefined
                        }
                      >
                        {row.lastLoginAt
                          ? formatDate(row.lastLoginAt)
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="size-8 shrink-0 px-0"
                          aria-label={`View ${row.fullName}`}
                          onClick={() => onViewUser(row)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={statusMutation.isPending}
                          className="size-8 shrink-0 border-brand-orange px-0 text-brand-orange hover:bg-brand-orange/5"
                          aria-label={
                            row.isActive
                              ? `Deactivate ${row.fullName}`
                              : `Activate ${row.fullName}`
                          }
                          title={row.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() =>
                            statusMutation.mutate({
                              id: row.id,
                              isActive: !row.isActive,
                              name: row.fullName,
                            })
                          }
                        >
                          {row.isActive ? (
                            <UserX className="size-3.5" />
                          ) : (
                            <UserCheck className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full space-y-3 px-4 py-4 text-left hover:bg-ivory/60"
                  onClick={() => onViewUser(row)}
                >
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
                      label={tableRoleLabel(row.roleCode)}
                      tone={roleTone(row.roleCode)}
                      className="whitespace-nowrap"
                      title={row.roleLabel}
                    />
                    <span className="text-xs text-text-secondary">
                      {row.businessName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      Joined {formatDate(row.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <UsersPagination meta={meta} onPageChange={onPageChange} />
        </>
      )}
    </div>
  );
}
