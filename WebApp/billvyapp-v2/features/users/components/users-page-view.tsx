'use client';
import dynamic from 'next/dynamic';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useUsers } from '../hooks/use-users';
import { assignableRoles } from '../services/users.service';
import type { UserStatusFilter } from '../types/users.types';
const LazyCreateUserDialog = dynamic(() => import('./create-user-dialog').then((module) => module.CreateUserDialog), { loading: () => <p role="status">Opening dialog…</p> });
function CreateUserDialog(props: import('react').ComponentProps<typeof import('./create-user-dialog').CreateUserDialog>) {
  return props.open ? <LazyCreateUserDialog {...props} /> : null;
}
const LazyUserDetailsDialog = dynamic(() => import('./user-details-dialog').then((module) => module.UserDetailsDialog), { loading: () => <p role="status">Opening dialog…</p> });
function UserDetailsDialog(props: import('react').ComponentProps<typeof import('./user-details-dialog').UserDetailsDialog>) {
  return props.open ? <LazyUserDetailsDialog {...props} /> : null;
}
import { UsersFilters } from './users-filters';
import { UsersSidebar } from './users-sidebar';
import { UsersTable } from './users-table';

const PAGE_SIZE = 8;

export function UsersPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [roleId, setRoleId] = useState('all');
  const [franchiseId, setFranchiseId] = useState('all');
  const [status, setStatus] = useState<UserStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, roleId, franchiseId, status]);

  const query = useUsers({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    roleId,
    franchiseId,
    status,
  });

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Users unavailable"
          message="We could not load platform users. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;
  const emptyMeta = {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
        />

        <div className="grid gap-6 content-lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-7">
          <div className="space-y-4">
            <UsersFilters
              search={searchInput}
              roleId={roleId}
              franchiseId={franchiseId}
              status={status}
              roles={data?.roles ?? []}
              franchises={data?.franchises ?? []}
              onSearchChange={setSearchInput}
              onRoleChange={(value) => {
                startTransition(() => setRoleId(value));
              }}
              onFranchiseChange={(value) => {
                startTransition(() => setFranchiseId(value));
              }}
              onStatusChange={(value) => {
                startTransition(() => setStatus(value));
              }}
              onAddUser={() => setCreateOpen(true)}
            />

            <UsersTable
              rows={data?.rows ?? []}
              meta={data?.meta ?? emptyMeta}
              isLoading={query.isLoading && !data}
              isError={query.isError}
              onRetry={() => void query.refetch()}
              onPageChange={(next) => {
                startTransition(() => setPage(next));
              }}
              onViewUser={(user) => setSelectedUserId(user.id)}
            />
          </div>

          <UsersSidebar
            totalCount={data?.totalCount ?? 0}
            roleSummary={data?.roleSummary ?? []}
            isLoading={query.isLoading && !data}
            onAddUser={() => setCreateOpen(true)}
          />
        </div>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={assignableRoles(data?.roles ?? [])}
        franchises={data?.franchises ?? []}
      />

      <UserDetailsDialog
        userId={selectedUserId}
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      />
    </>
  );
}
