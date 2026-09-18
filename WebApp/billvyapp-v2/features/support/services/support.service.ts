import { format, startOfMonth } from 'date-fns';

import type { DashboardMetric } from '@/features/dashboard/services/dashboard.service';
import type {
  SupportListParams,
  SupportPageData,
  SupportTicketRow,
} from '../types/support.types';

function buildMetrics(counts: {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}): DashboardMetric[] {
  return [
    {
      id: 'support-total-tickets',
      label: 'Total Tickets',
      value: String(counts.total),
      rawValue: counts.total,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-open-tickets',
      label: 'Open Tickets',
      value: String(counts.open),
      rawValue: counts.open,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'success',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-in-progress',
      label: 'In Progress',
      value: String(counts.inProgress),
      rawValue: counts.inProgress,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'accent',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-resolved',
      label: 'Resolved Tickets',
      value: String(counts.resolved),
      rawValue: counts.resolved,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
    {
      id: 'support-closed',
      label: 'Closed Tickets',
      value: String(counts.closed),
      rawValue: counts.closed,
      comparisonLabel: 'current total',
      changePercent: null,
      tone: 'neutral',
      comparisonIsPlaceholder: false,
    },
  ];
}

/**
 * Support tickets have no backend API yet.
 * Returns empty ticket lists and zeroed metrics until an endpoint exists.
 */
export async function fetchSupportPage(
  params: SupportListParams,
): Promise<SupportPageData> {
  void params;

  const tickets: SupportTicketRow[] = [];

  return {
    metrics: buildMetrics({
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    }),
    rows: tickets,
    meta: {
      page: 1,
      limit: params.limit,
      total: 0,
      totalPages: 0,
    },
    statusSummary: [
      {
        key: 'open',
        label: 'Open',
        count: 0,
        percent: 0,
        color: 'var(--bv-emerald)',
      },
      {
        key: 'in_progress',
        label: 'In Progress',
        count: 0,
        percent: 0,
        color: 'var(--bv-champagne)',
      },
      {
        key: 'resolved',
        label: 'Resolved',
        count: 0,
        percent: 0,
        color: '#35507a',
      },
      {
        key: 'closed',
        label: 'Closed',
        count: 0,
        percent: 0,
        color: '#9ca3af',
      },
    ],
    categorySummary: [],
    totalCount: 0,
  };
}

export function defaultSupportDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  return {
    dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
  };
}
