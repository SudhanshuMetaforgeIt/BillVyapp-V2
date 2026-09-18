'use client';

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useCampaigns } from '../hooks/use-campaigns';
import type { CampaignStatusTab } from '../types/campaigns.types';
import { CampaignsFilters } from './campaigns-filters';
import { CampaignsSidePanel } from './campaigns-side-panel';
import { CampaignsTable } from './campaigns-table';

const PAGE_SIZE = 10;

export function CampaignsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [statusTab, setStatusTab] = useState<CampaignStatusTab>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusTab]);

  const query = useCampaigns({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    statusTab,
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
          title="Campaigns unavailable"
          message="We could not load campaigns. Please try again."
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
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <MetricGrid
        metrics={data?.metrics ?? []}
        isLoading={query.isLoading && !data}
        className="xl:grid-cols-4"
        skeletonCount={4}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <CampaignsFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            apiUnavailable={data?.apiUnavailable}
          />

          <CampaignsTable
            rows={data?.rows ?? []}
            meta={data?.meta ?? emptyMeta}
            statusTab={statusTab}
            onStatusTabChange={(value) => {
              startTransition(() => setStatusTab(value));
            }}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            apiUnavailable={data?.apiUnavailable}
          />
        </div>

        <CampaignsSidePanel summary={data?.summary ?? []} />
      </div>
    </div>
  );
}
