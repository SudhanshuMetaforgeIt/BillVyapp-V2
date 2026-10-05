'use client';

import {
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  CampaignListRow,
  PaginationMeta,
} from '../types/campaigns.types';
import { CampaignsTabs } from './campaigns-tabs';
import type { CampaignStatusTab } from '../types/campaigns.types';

type CampaignsTableProps = {
  rows: CampaignListRow[];
  meta: PaginationMeta;
  statusTab: CampaignStatusTab;
  onStatusTabChange: (value: CampaignStatusTab) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  apiUnavailable?: boolean;
  onOpen?: (row: CampaignListRow) => void;
};

export function CampaignsTable({
  rows,
  meta,
  statusTab,
  onStatusTabChange,
  isLoading,
  isError,
  onRetry,
  apiUnavailable,
  onOpen,
}: CampaignsTableProps) {
  return (
    <div className="app-surface-card overflow-hidden" data-dash-animate="section">
      <CampaignsTabs value={statusTab} onChange={onStatusTabChange} />

      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load campaigns. Please try again."
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <SectionEmptyState
          title={apiUnavailable ? 'Campaigns coming soon' : 'No campaigns found'}
          message={
            apiUnavailable
              ? 'There is no campaigns API on the server yet. Metrics stay at zero until it is available.'
              : 'Try adjusting filters, or create a new campaign.'
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => <button key={row.id} type="button" onClick={() => onOpen?.(row)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:bg-muted/40"><div><p className="font-semibold text-text">{row.name}</p><p className="text-xs text-text-secondary">{row.typeLabel} · {row.campaign.salon.name} · {row.audienceLabel} · {row.periodLabel}</p>{row.campaign.offerDescription ? <p className="mt-1 text-sm text-text-secondary">{row.campaign.offerDescription}</p> : row.description ? <p className="mt-1 text-sm text-text-secondary">{row.description}</p> : null}</div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-text">{row.statusLabel}</span></button>)}
          <p className="p-3 text-right text-xs text-text-secondary">{meta.total} campaign{meta.total === 1 ? '' : 's'}</p>
        </div>
      )}
    </div>
  );
}
