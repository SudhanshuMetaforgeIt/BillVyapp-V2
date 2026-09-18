'use client';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { usePayments } from '../hooks/use-payments';
import { defaultPaymentsDateRange } from '../services/payments.service';
import type {
  PaymentMethodFilter,
  PaymentStatusFilter,
} from '../types/payments.types';
import { PaymentsFilters } from './payments-filters';
import { PaymentsSidebar } from './payments-sidebar';
import { PaymentsTable } from './payments-table';

const PAGE_SIZE = 8;

export function PaymentsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const defaults = defaultPaymentsDateRange();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [franchiseId, setFranchiseId] = useState('all');
  const [method, setMethod] = useState<PaymentMethodFilter>('all');
  const [status, setStatus] = useState<PaymentStatusFilter>('all');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, franchiseId, method, status, dateFrom, dateTo]);

  const query = usePayments({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    franchiseId,
    method,
    status,
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
          title="Payments unavailable"
          message="We could not load payment records. Please try again."
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
        <div className="space-y-4">
          <PaymentsFilters
            search={searchInput}
            franchiseId={franchiseId}
            method={method}
            status={status}
            dateFrom={dateFrom}
            dateTo={dateTo}
            franchises={data?.franchises ?? []}
            onSearchChange={setSearchInput}
            onFranchiseChange={(value) => {
              startTransition(() => setFranchiseId(value));
            }}
            onMethodChange={(value) => {
              startTransition(() => setMethod(value));
            }}
            onStatusChange={(value) => {
              startTransition(() => setStatus(value));
            }}
            onDateFromChange={(value) => {
              startTransition(() => setDateFrom(value));
            }}
            onDateToChange={(value) => {
              startTransition(() => setDateTo(value));
            }}
          />

          <PaymentsTable
            rows={data?.rows ?? []}
            meta={data?.meta ?? emptyMeta}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            onPageChange={(next) => {
              startTransition(() => setPage(next));
            }}
          />
        </div>

        <PaymentsSidebar
          totalCount={data?.totalCount ?? 0}
          summary={data?.summary ?? []}
          isLoading={query.isLoading && !data}
        />
      </div>
    </div>
  );
}
