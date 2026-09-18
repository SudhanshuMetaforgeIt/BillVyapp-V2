'use client';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { usePlans } from '../hooks/use-plans';
import type { PlanStatusFilter, PlatformPlan } from '../types/plans.types';
import { CreatePlanDialog } from './create-plan-dialog';
import { PlansFilters } from './plans-filters';
import { PlansSidebar } from './plans-sidebar';
import { PlansTable } from './plans-table';

const PAGE_SIZE = 5;

export function PlansPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [status, setStatus] = useState<PlanStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlatformPlan | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status]);

  const query = usePlans({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
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
          title="Plans unavailable"
          message="We could not load subscription plans. Please try again."
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
          <div className="space-y-4">
            <PlansFilters
              search={searchInput}
              status={status}
              onSearchChange={setSearchInput}
              onStatusChange={(value) => {
                startTransition(() => setStatus(value));
              }}
              onAddPlan={() => {
                setEditPlan(null);
                setDialogOpen(true);
              }}
            />

            <PlansTable
              rows={data?.rows ?? []}
              meta={data?.meta ?? emptyMeta}
              isLoading={query.isLoading && !data}
              isError={query.isError}
              onRetry={() => void query.refetch()}
              onPageChange={(next) => {
                startTransition(() => setPage(next));
              }}
              onEditPlan={(plan) => {
                setEditPlan(plan);
                setDialogOpen(true);
              }}
            />
          </div>

          <PlansSidebar
            averagePrice={data?.averagePrice ?? 0}
            priceOverview={data?.priceOverview ?? []}
            isLoading={query.isLoading && !data}
            onAddPlan={() => {
              setEditPlan(null);
              setDialogOpen(true);
            }}
          />
        </div>
      </div>

      <CreatePlanDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditPlan(null);
        }}
        editPlan={editPlan}
      />
    </>
  );
}
