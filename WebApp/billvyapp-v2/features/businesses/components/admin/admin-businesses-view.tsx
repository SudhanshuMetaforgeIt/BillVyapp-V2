'use client';

import { useRef, useState } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { useGSAP, playDashboardEntrance } from '@/lib/animations';
import { useAdminMyBusiness } from '../../hooks/use-admin-my-business';
import { AdminBusinessStatsCards } from './admin-business-stats';
import { AdminBusinessOverviewCard } from './admin-business-overview-card';
import { AdminBranchesTable } from './admin-branches-table';
import { AdminBusinessesSidebar } from './admin-businesses-sidebar';
import { AdminCreateBranchDialog } from './admin-create-branch-dialog';
import type { AdminBranchItem } from '../../types/admin-my-business.types';

export function AdminBusinessesView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useAdminMyBusiness();
  const data = query.data;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
      {/* ── Top 5 Metric Cards ── */}
      <AdminBusinessStatsCards stats={data?.stats} isLoading={query.isLoading} />

      {/* ── Main 2-Column Grid ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(18rem,1fr)] lg:gap-7">
        {/* Left column: Business Overview + All Branches table */}
        <div className="space-y-6 lg:space-y-7 min-w-0">
          <AdminBusinessOverviewCard
            franchise={data?.franchise}
            isLoading={query.isLoading}
            onEdit={() => {}}
          />

          <AdminBranchesTable
            branches={data?.branches ?? []}
            onAddBranch={() => setCreateDialogOpen(true)}
            onViewBranch={(branch: AdminBranchItem) => {}}
            onEditBranch={(branch: AdminBranchItem) => {}}
          />
        </div>

        {/* Right column: Overview (All Branches) + Quick Actions + Need Help */}
        <div className="min-w-0">
          <AdminBusinessesSidebar
            overview={data?.overview}
            onAddBranch={() => setCreateDialogOpen(true)}
          />
        </div>
      </div>

      {/* ── Create Branch Modal Dialog ── */}
      <AdminCreateBranchDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}
