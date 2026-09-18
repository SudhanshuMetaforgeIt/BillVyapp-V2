import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  CampaignsListParams,
  CampaignsPageData,
} from '../types/campaigns.types';

function zeroMetrics(): DashboardMetric[] {
  return [
    {
      id: 'camp-total',
      label: 'Total Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: true,
    },
    {
      id: 'camp-active',
      label: 'Active Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: true,
    },
    {
      id: 'camp-upcoming',
      label: 'Upcoming Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: true,
    },
    {
      id: 'camp-completed',
      label: 'Completed Campaigns',
      value: '0',
      rawValue: 0,
      comparisonLabel: 'no campaigns API yet',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: true,
    },
  ];
}

/**
 * Campaigns are not implemented on the backend yet (no Prisma model / routes).
 * Return an honest empty payload so the UI matches the mockup without inventing data.
 */
export async function fetchCampaignsPage(
  params: CampaignsListParams,
): Promise<CampaignsPageData> {
  void params;
  return {
    rows: [],
    meta: {
      page: 1,
      limit: params.limit,
      total: 0,
      totalPages: 0,
    },
    metrics: zeroMetrics(),
    summary: [
      { status: 'Active', count: 0, tone: 'success' },
      { status: 'Upcoming', count: 0, tone: 'warning' },
      { status: 'Completed', count: 0, tone: 'neutral' },
      { status: 'Draft', count: 0, tone: 'muted' },
    ],
    apiUnavailable: true,
  };
}
