'use client';
import dynamic from 'next/dynamic';

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useCampaigns } from '../hooks/use-campaigns';
import type { CampaignInput, CampaignStatusTab } from '../types/campaigns.types';
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
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', salonId: user?.salonId ?? '', type: 'OFFER', targetAudience: 'ALL_CUSTOMERS', startDate: '', endDate: '', offerDescription: '', message: '', channels: ['PUSH', 'IN_APP'] });
  const create = useMutation({ mutationFn: createCampaign, onSuccess: () => { toast.success('Campaign draft created'); setCreating(false); queryClient.invalidateQueries({ queryKey: ['campaigns'] }); }, onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not create campaign') });

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

      <div className="grid gap-5 content-lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <CampaignsFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            apiUnavailable={data?.apiUnavailable}
            onCreate={() => setCreating(true)}
          />

          {creating ? <form className="app-surface-card space-y-3 p-5" onSubmit={(event) => { event.preventDefault(); if (!form.salonId) return toast.error('A salon is required'); const input: CampaignInput = { salonId: form.salonId, name: form.name, description: null, type: form.type as CampaignInput['type'], targetAudience: form.targetAudience as CampaignInput['targetAudience'], startDate: form.startDate ? new Date(form.startDate).toISOString() : null, endDate: form.endDate ? new Date(form.endDate).toISOString() : null, offerDescription: form.offerDescription || null, promotionalMediaFileId: null, message: form.message || null, deliveryChannels: form.channels as CampaignInput['deliveryChannels'] }; create.mutate(input); }}><h2 className="text-lg font-semibold">Create campaign draft</h2><div className="grid gap-3 md:grid-cols-2"><Input required placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input required placeholder="Salon ID" value={form.salonId} disabled={user?.role === 'MANAGER'} onChange={(e) => setForm({ ...form, salonId: e.target.value })} /><select className="h-10 rounded-md border border-border bg-background px-3" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="SALON">Salon</option><option value="SERVICE">Service</option><option value="OFFER">Offer</option><option value="EVENT">Event</option></select><select className="h-10 rounded-md border border-border bg-background px-3" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}><option value="ALL_CUSTOMERS">All customers</option><option value="NEW_CUSTOMERS">New customers</option><option value="EXISTING_CUSTOMERS">Existing customers</option><option value="SALON_CUSTOMERS">Salon customers</option></select><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /><Input placeholder="Offer or discount" value={form.offerDescription} onChange={(e) => setForm({ ...form, offerDescription: e.target.value })} /><Input placeholder="Message / content" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div><div className="flex gap-2"><Button type="submit" disabled={create.isPending}>Save draft</Button><Button type="button" variant="outline" onClick={() => setCreating(false)}>Cancel</Button></div></form> : null}

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
            onOpen={(row) => setSelectedCampaignId(row.id)}
          />
        </div>

        <CampaignsSidePanel summary={data?.summary ?? []} onCreate={() => setCreating(true)} />
      </div>
      <CampaignDetailsDialog id={selectedCampaignId} onClose={() => setSelectedCampaignId(null)} />
    </div>
  );
}
