'use client';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useBusinesses } from '../hooks/use-businesses';
import type {
  BusinessStatusFilter,
} from '../types/businesses.types';
import { BusinessesFilters } from './businesses-filters';
import { BusinessesSidebar } from './businesses-sidebar';
import { BusinessesTable } from './businesses-table';
import { CreateBusinessDialog } from './create-business-dialog';

const PAGE_SIZE = 7;

export function BusinessesPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [status, setStatus] = useState<BusinessStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

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

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
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
    </>
  );
}
