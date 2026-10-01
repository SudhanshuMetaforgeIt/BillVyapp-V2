'use client';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import type { RevenuePoint } from '../data/placeholders';
import {
  fetchRevenueSeries,
  type RevenueBucket,
} from '../services/dashboard.service';

export const REVENUE_SERIES_QUERY_KEY = ['dashboard', 'revenue-series'] as const;

export function useRevenueSeries(
  dateFrom: string,
  dateTo: string,
  bucket: RevenueBucket = 'month',
  enabled = true,
) {
  return useScopedQuery<RevenuePoint[]>(
    [...REVENUE_SERIES_QUERY_KEY, dateFrom, dateTo, bucket],
    () => fetchRevenueSeries(dateFrom, dateTo, bucket),
    {
      enabled: enabled && Boolean(dateFrom && dateTo && dateFrom <= dateTo),
    },
  );
}
