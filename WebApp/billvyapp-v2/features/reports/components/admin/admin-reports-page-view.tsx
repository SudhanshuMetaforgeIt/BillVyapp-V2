'use client';
import { DeferredContent } from '@/components/ui/deferred-content';
import dynamic from 'next/dynamic';

import { useRef, useState } from 'react';
import { CalendarDays, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { reportDate } from './admin-report-panel';
import { AdminServicePerformance } from './admin-service-performance';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/services/api-client';
import {
  downloadAdminReport,
  fetchAdminReportHistory,
  generateAdminReport,
  type AdminGeneratedReport,
} from '../../services/admin-reports.service';
import { AdminReportHistory } from './admin-report-history';
import { useAdminReports } from '../../hooks/use-admin-reports';
import { AdminReportsStats } from './admin-reports-stats';
import { AdminReportsFilters } from './admin-reports-filters';


import { BranchComparisonCard } from './branch-comparison-card';
import type { AdminReportsFilterState } from '../../types/admin-reports.types';

export function AdminReportsPageView() {
  const [filters, setFilters] = useState<AdminReportsFilterState>({
    dateFrom: undefined,
    dateTo: undefined,
    branchId: 'all',
    reportType: 'overview',
    interval: 'day',
  });

  const { data, isLoading, isFetching, isError, refetch } = useAdminReports(filters);
  const history = useQuery({
    queryKey: ['admin-report-history'],
    queryFn: fetchAdminReportHistory,
    staleTime: 2 * 60_000,
  });
  const queryClient = useQueryClient();
  const downloading = useRef(false);
  const [downloadPhase, setDownloadPhase] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFiltersChange = (updated: Partial<AdminReportsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const stats = data?.stats || {
    totalRevenue: 0,
    totalRevenueChange: 'No data yet',
    totalBills: 0,
    totalBillsChange: 'No data yet',
    totalCustomers: 0,
    totalCustomersChange: 'No data yet',
    totalServices: 0,
    totalServicesChange: 'No data yet',
    totalStaff: 0,
    totalStaffChange: 'No data yet',
  };

  const revenueSeries = data?.revenueSeries || [];
  const billsOverview = data?.billsOverview || {
    total: 0,
    paid: 0,
    paidPct: 0,
    pending: 0,
    pendingPct: 0,
    overdue: 0,
    overduePct: 0,
    cancelled: 0,
    cancelledPct: 0,
  };
  const branchComparison = data?.branchComparison || [];
  const topServicesByRevenue = data?.topServicesByRevenue || [];
  const topServicesByQuantity = data?.topServicesByQuantity || [];
  const branches = data?.branches || [];

  const handleDownloadReport = async (existing?: AdminGeneratedReport) => {
    if (downloading.current) return;
    downloading.current = true;
    setDownloadError(null);
    const selected = {
      ...filters,
      dateFrom: filters.dateFrom || data?.scope.dateFrom,
      dateTo: filters.dateTo || data?.scope.dateTo,
    };
    try {
      setDownloadPhase(existing ? 'Downloading...' : 'Generating report...');
      const report = existing ?? (await generateAdminReport(selected));
      setDownloadPhase('Downloading...');
      await downloadAdminReport(report);
    } catch (error) {
      setDownloadError(
        isApiError(error) && error.status === 400
          ? error.message
          : 'Unable to generate or download report. Please try again.',
      );
    } finally {
      downloading.current = false;
      setDownloadPhase('');
      void queryClient.invalidateQueries({
        queryKey: ['admin-report-history'],
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-champagne">
            Franchise overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Business performance
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Revenue, branches and services at a glance.
          </p>
        </div>
        {data && (
          <div className="flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-medium text-text-secondary">
            <CalendarDays
              className="size-4 shrink-0 text-champagne"
              aria-hidden
            />
            <span>
              {reportDate(data.scope.dateFrom)} –{' '}
              {reportDate(data.scope.dateTo)}
            </span>
          </div>
        )}
      </div>
      <AdminReportsFilters
        filters={{
          ...filters,
          dateFrom: filters.dateFrom ?? data?.scope.dateFrom,
          dateTo: filters.dateTo ?? data?.scope.dateTo,
        }}
        onChange={handleFiltersChange}
        branches={branches}
        onDownloadReport={() => void handleDownloadReport()}
        downloadDisabled={!!downloadPhase || isLoading || isFetching || isError}
        downloadPhase={downloadPhase}
        downloadError={downloadError}
      />
      {isFetching && data ? <p role="status" className="text-xs text-text-secondary">Updating report; showing previous figures…</p> : null}
      {isError && data ? <p role="alert" className="text-xs text-danger">Could not refresh the report. Previous figures are still shown.</p> : null}
      {isError && !data ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          Unable to load report data.{' '}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <AdminReportsStats stats={stats} loading={isLoading && !data} />
          {isLoading && !data ? (
            <div
              className="grid gap-6 content-lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]"
              aria-label="Loading report charts"
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-[400px] animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="grid items-stretch gap-6 content-lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
                <RevenueOverviewChart
                  series={revenueSeries}
                  interval={filters.interval || 'day'}
                  onIntervalChange={(interval) =>
                    handleFiltersChange({ interval })
                  }
                />
                <BillsOverviewDonut summary={billsOverview} />
              </div>
              <div className="grid items-stretch gap-6 content-lg:grid-cols-2">
                <BranchComparisonCard items={branchComparison} />
                <AdminServicePerformance
                  revenue={topServicesByRevenue}
                  quantity={topServicesByQuantity}
                />
              </div>
            </>
          )}
          {data && (
            <details className="rounded-xl px-1 text-xs text-text-secondary">
              <summary className="w-fit cursor-pointer font-medium">
                About these figures
              </summary>
              <p className="mt-2 max-w-3xl leading-relaxed">
                Revenue is collected on completed bills dated in the selected
                period. Customer counts include customers with bill history in
                this scope; service and staff counts reflect the current
                catalogue and team. Dates follow {data.scope.timeZone}. Selected
                scope: {data.scope.branch}.
              </p>
            </details>
          )}
        </>
      )}
      <AdminReportHistory
        reports={history.data || []}
        loading={history.isLoading}
        error={history.isError}
        onRetry={() => void history.refetch()}
        onDownload={(report) => void handleDownloadReport(report)}
        disabled={!!downloadPhase}
      />
      <nav
        aria-label="Related business pages"
        className="flex flex-wrap items-center gap-x-6 gap-y-3 px-1 text-xs text-text-secondary"
      >
        <span>Explore your business</span>
        {[
          ['Bills', 'bills'],
          ['Customers', 'customers'],
          ['Staff', 'staff'],
        ].map(([name, path]) => (
          <Link
            key={path}
            href={`/dashboard/admin/${path}`}
            className="inline-flex min-h-8 items-center gap-1 font-medium hover:text-brand-orange"
          >
            {name}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}

const LazyRevenueOverviewChart = dynamic(() => import('./revenue-overview-chart').then((module) => module.RevenueOverviewChart), { loading: () => <div role="status" aria-label="Loading chart" className="h-[400px] animate-pulse rounded-2xl border border-border bg-surface" /> });
function RevenueOverviewChart(props: import('react').ComponentProps<typeof import('./revenue-overview-chart').RevenueOverviewChart>) {
  return <DeferredContent><LazyRevenueOverviewChart {...props} /></DeferredContent>;
}

const LazyBillsOverviewDonut = dynamic(() => import('./bills-overview-donut').then((module) => module.BillsOverviewDonut), { loading: () => <div role="status" aria-label="Loading chart" className="h-[400px] animate-pulse rounded-2xl border border-border bg-surface" /> });
function BillsOverviewDonut(props: import('react').ComponentProps<typeof import('./bills-overview-donut').BillsOverviewDonut>) {
  return <DeferredContent><LazyBillsOverviewDonut {...props} /></DeferredContent>;
}
