'use client';
import dynamic from 'next/dynamic';
import { Modal } from '@/components/data/modal';

import { useRef, useState } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { useGSAP, playDashboardEntrance } from '@/lib/animations';
import { useAdminMyBusiness } from '../../hooks/use-admin-my-business';
import { AdminBusinessStatsCards } from './admin-business-stats';
import { AdminBusinessOverviewCard } from './admin-business-overview-card';
import { AdminBranchesTable } from './admin-branches-table';
import { AdminBusinessesSidebar } from './admin-businesses-sidebar';
const LazyAdminCreateBranchDialog = dynamic(() => import('./admin-create-branch-dialog').then((module) => module.AdminCreateBranchDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AdminCreateBranchDialog(props: import('react').ComponentProps<typeof import('./admin-create-branch-dialog').AdminCreateBranchDialog>) {
  return props.isOpen ? <LazyAdminCreateBranchDialog {...props} /> : null;
}
const LazyAdminEditBusinessDialog = dynamic(() => import('./admin-edit-business-dialog').then((module) => module.AdminEditBusinessDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AdminEditBusinessDialog(props: import('react').ComponentProps<typeof import('./admin-edit-business-dialog').AdminEditBusinessDialog>) {
  return props.isOpen ? <LazyAdminEditBusinessDialog {...props} /> : null;
}
const LazyAdminEditBranchDialog = dynamic(() => import('./admin-edit-branch-dialog').then((module) => module.AdminEditBranchDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AdminEditBranchDialog(props: import('react').ComponentProps<typeof import('./admin-edit-branch-dialog').AdminEditBranchDialog>) {
  return props.isOpen ? <LazyAdminEditBranchDialog {...props} /> : null;
}
import type { AdminBranchItem } from '../../types/admin-my-business.types';

export function AdminBusinessesView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useAdminMyBusiness();
  const data = query.data;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editBusinessOpen, setEditBusinessOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<AdminBranchItem | null>(null);
  const [viewingBranch, setViewingBranch] = useState<AdminBranchItem | null>(null);

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (query.isError) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Unable to load business details"
          message="We could not load your franchise overview. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7 pb-10">
      <AdminBusinessStatsCards stats={data?.stats} isLoading={query.isLoading} />

      <div className="grid gap-6 content-lg:grid-cols-[minmax(0,1.85fr)_minmax(18rem,1fr)] lg:gap-7">
        <div className="space-y-6 lg:space-y-7 min-w-0">
          <AdminBusinessOverviewCard
            franchise={data?.franchise}
            isLoading={query.isLoading}
            onEdit={() => setEditBusinessOpen(true)}
          />

          <AdminBranchesTable
            branches={data?.branches ?? []}
            onAddBranch={() => setCreateDialogOpen(true)}
            onViewBranch={setViewingBranch}
            onEditBranch={(branch) => setEditingBranch(branch)}
          />
        </div>

        <div className="min-w-0">
          <AdminBusinessesSidebar
            overview={data?.overview}
            onAddBranch={() => setCreateDialogOpen(true)}
          />
        </div>
      </div>

      <AdminCreateBranchDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      <AdminEditBusinessDialog
        isOpen={editBusinessOpen}
        onClose={() => setEditBusinessOpen(false)}
        franchise={data?.franchise}
      />

      <AdminEditBranchDialog
        isOpen={Boolean(editingBranch)}
        onClose={() => setEditingBranch(null)}
        branch={editingBranch}
      />
      <Modal open={Boolean(viewingBranch)} onClose={() => setViewingBranch(null)} title={viewingBranch?.name ?? 'Branch'}>
        {viewingBranch && <dl className="space-y-3 text-sm text-text">
          <div><dt className="text-text-secondary">Code</dt><dd>{viewingBranch.code}</dd></div>
          <div><dt className="text-text-secondary">Location</dt><dd>{viewingBranch.location}</dd></div>
          <div><dt className="text-text-secondary">Manager</dt><dd>{viewingBranch.managerName ?? '—'}</dd></div>
          <div><dt className="text-text-secondary">Manager phone</dt><dd>{viewingBranch.managerPhone ?? '—'}</dd></div>
          <div><dt className="text-text-secondary">Staff</dt><dd>{viewingBranch.staffCount ?? '—'}</dd></div>
          <div><dt className="text-text-secondary">Status</dt><dd>{viewingBranch.status}</dd></div>
        </dl>}
      </Modal>
    </div>
  );
}
