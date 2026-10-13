'use client';
import dynamic from 'next/dynamic';

import {
  useDeferredValue,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CampaignDraftForm } from './campaign-draft-form';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useCampaigns } from '../hooks/use-campaigns';
import type { CampaignStatusTab } from '../types/campaigns.types';
import { createCampaign } from '../services/campaigns.service';
import { CampaignsFilters } from './campaigns-filters';
import { CampaignsSidePanel } from './campaigns-side-panel';
import { CampaignsTable } from './campaigns-table';
const LazyCampaignDetailsDialog = dynamic(() => import('./campaign-details-dialog').then((module) => module.CampaignDetailsDialog), { loading: () => <p role="status">Opening dialog…</p> });
function CampaignDetailsDialog(props: import('react').ComponentProps<typeof import('./campaign-details-dialog').CampaignDetailsDialog>) {
  return props.id ? <LazyCampaignDetailsDialog {...props} /> : null;
}

const PAGE_SIZE = 10;

export function CampaignsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const create = useMutation({ mutationFn: createCampaign, onSuccess: () => { toast.success('Campaign draft created'); setCreating(false); queryClient.invalidateQueries({ queryKey: ['campaigns'] }); }, onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not create campaign') });
  const openDraft = () => {
    if (create.isPending) return;
    create.reset();
    setCreating(true);
  };

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [statusTab, setStatusTab] = useState<CampaignStatusTab>('all');
  const [page, setPage] = useState(1);

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

      <div className="grid gap-5 content-lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <CampaignsFilters
            search={searchInput}
            onSearchChange={(value) => { setSearchInput(value); setPage(1); }}
            apiUnavailable={data?.apiUnavailable}
            onCreate={openDraft}
          />

          {creating ? <CampaignDraftForm busy={create.isPending} error={create.error} onCreate={input => create.mutate(input)} onCancel={() => setCreating(false)} /> : null}

          <CampaignsTable
            rows={data?.rows ?? []}
            meta={data?.meta ?? emptyMeta}
            statusTab={statusTab}
            onStatusTabChange={(value) => {
              startTransition(() => { setStatusTab(value); setPage(1); });
            }}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            apiUnavailable={data?.apiUnavailable}
            onOpen={(row) => setSelectedCampaignId(row.id)}
          />
        </div>

        <CampaignsSidePanel summary={data?.summary ?? []} onCreate={openDraft} />
      </div>
      <CampaignDetailsDialog id={selectedCampaignId} onClose={() => setSelectedCampaignId(null)} />
    </div>
  );
}
