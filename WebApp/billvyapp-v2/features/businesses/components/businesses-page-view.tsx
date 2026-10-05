'use client';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useUpdateBusinessStatus } from '../hooks/use-business-mutations';
import { useBusinesses } from '../hooks/use-businesses';
import type {
  BusinessListRow,
  BusinessStatusFilter,
} from '../types/businesses.types';
import { BusinessesFilters } from './businesses-filters';
import { BusinessesSidebar } from './businesses-sidebar';
import { BusinessesTable } from './businesses-table';
import { CreateBusinessDialog } from './create-business-dialog';
import { EditBusinessDialog } from './edit-business-dialog';
import { EnrollBusinessPlanDialog } from './enroll-business-plan-dialog';

const PAGE_SIZE = 7;

export function BusinessesPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [status, setStatus] = useState<BusinessStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessListRow | null>(null);
  const [enrolling, setEnrolling] = useState<BusinessListRow | null>(null);

  const statusMutation = useUpdateBusinessStatus();

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status]);

  const query = useBusinesses({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    status,
    plan: 'all',
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
          title="Businesses unavailable"
          message="We could not load the businesses list. Please try again."
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

  const openEditor = (row: BusinessListRow) => setEditing(row);

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
        />

        <div className="grid gap-6 content-lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
          <div className="space-y-4">
            <BusinessesFilters
              search={searchInput}
              status={status}
              onSearchChange={setSearchInput}
              onStatusChange={(value) => {
                startTransition(() => setStatus(value));
              }}
              onAddBusiness={() => setCreateOpen(true)}
            />

            <BusinessesTable
              rows={data?.rows ?? []}
              meta={data?.meta ?? emptyMeta}
              isLoading={query.isLoading && !data}
              isError={query.isError}
              onRetry={() => void query.refetch()}
              onPageChange={(next) => {
                startTransition(() => setPage(next));
              }}
              onEditBusiness={openEditor}
              onEnrollPlan={(row) => setEnrolling(row)}
              onToggleStatus={(row) => {
                statusMutation.mutate({
                  id: row.id,
                  isActive: !row.isActive,
                  name: row.name,
                });
              }}
              statusPendingId={
                statusMutation.isPending
                  ? (statusMutation.variables?.id ?? null)
                  : null
              }
            />
          </div>

          <BusinessesSidebar
            total={data?.total ?? 0}
            summary={data?.summary ?? []}
            planMix={data?.planMix ?? []}
            isLoading={query.isLoading && !data}
          />
        </div>
      </div>

      <CreateBusinessDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditBusinessDialog
        business={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <EnrollBusinessPlanDialog
        business={enrolling}
        open={enrolling !== null}
        onOpenChange={(open) => {
          if (!open) setEnrolling(null);
        }}
      />
    </>
  );
}
