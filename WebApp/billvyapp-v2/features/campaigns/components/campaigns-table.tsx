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
}: CampaignsTableProps) {
  void meta;

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
      ) : null}
    </div>
  );
}
