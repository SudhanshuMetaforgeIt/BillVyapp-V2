'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useReports } from '../hooks/use-reports';
import { defaultReportsDateRange } from '../services/reports.service';
import type { ReportTypeFilter } from '../types/reports.types';
import { ReportsFilters } from './reports-filters';
import { ReportsSidebar } from './reports-sidebar';
import { ReportsTable } from './reports-table';

const PAGE_SIZE = 7;

export function ReportsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const defaults = defaultReportsDateRange();

  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [franchiseId, setFranchiseId] = useState('all');
  const [reportType, setReportType] = useState<ReportTypeFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, franchiseId, reportType]);

  const query = useReports({
    page,
    limit: PAGE_SIZE,
    dateFrom,
    dateTo,
    franchiseId,
    reportType,
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
          title="Reports unavailable"
          message="We could not load platform reports. Please try again."
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
      />

      <ReportsFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        franchiseId={franchiseId}
        reportType={reportType}
        franchises={data?.franchises ?? []}
        onDateFromChange={(value) => {
          startTransition(() => setDateFrom(value));
        }}
        onDateToChange={(value) => {
          startTransition(() => setDateTo(value));
        }}
        onFranchiseChange={(value) => {
          startTransition(() => setFranchiseId(value));
        }}
        onReportTypeChange={(value) => {
          startTransition(() => setReportType(value));
        }}
        onGenerate={() =>
          toast(
            'Report generation will be available once the reports API is connected.',
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
        <ReportsTable
          rows={data?.rows ?? []}
          meta={data?.meta ?? emptyMeta}
          isLoading={query.isLoading && !data}
          isError={query.isError}
          onRetry={() => void query.refetch()}
          onPageChange={(next) => {
            startTransition(() => setPage(next));
          }}
        />

        <ReportsSidebar
          revenueSeries={data?.revenueSeries ?? []}
          reportsByType={data?.reportsByType ?? []}
          reportsTotal={data?.reportsTotal ?? 0}
          isLoading={query.isLoading && !data}
        />
      </div>
    </div>
  );
}
