'use client';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import {
  MetricCard,
  MetricCardSkeleton,
} from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useSupport } from '../hooks/use-support';
import { defaultSupportDateRange } from '../services/support.service';
import type {
  TicketCategoryFilter,
  TicketPriorityFilter,
  TicketStatusFilter,
} from '../types/support.types';
import { SupportFilters } from './support-filters';
import {
  SupportCategoriesBar,
  SupportSidebar,
} from './support-sidebar';
import { SupportTable } from './support-table';

const PAGE_SIZE = 7;

export function SupportPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const defaults = defaultSupportDateRange();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [status, setStatus] = useState<TicketStatusFilter>('all');
  const [priority, setPriority] = useState<TicketPriorityFilter>('all');
  const [category, setCategory] = useState<TicketCategoryFilter>('all');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status, priority, category, dateFrom, dateTo]);

  const query = useSupport({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    status,
    priority,
    category,
    dateFrom,
    dateTo,
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
          title="Support unavailable"
          message="We could not load support tickets. Please try again."
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
  const metrics = data?.metrics ?? [];
  const isLoading = query.isLoading && !data;

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))
          : metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
      </div>

      <SupportFilters
        search={searchInput}
        status={status}
        priority={priority}
        category={category}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => {
          startTransition(() => setStatus(value));
        }}
        onPriorityChange={(value) => {
          startTransition(() => setPriority(value));
        }}
        onCategoryChange={(value) => {
          startTransition(() => setCategory(value));
        }}
        onDateFromChange={(value) => {
          startTransition(() => setDateFrom(value));
        }}
        onDateToChange={(value) => {
          startTransition(() => setDateTo(value));
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
        <SupportTable
          rows={data?.rows ?? []}
          meta={data?.meta ?? emptyMeta}
          isLoading={isLoading}
          isError={query.isError}
          onRetry={() => void query.refetch()}
          onPageChange={(next) => {
            startTransition(() => setPage(next));
          }}
        />

        <SupportSidebar
          totalCount={data?.totalCount ?? 0}
          statusSummary={data?.statusSummary ?? []}
          isLoading={isLoading}
        />
      </div>

      <SupportCategoriesBar
        categories={data?.categorySummary ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
