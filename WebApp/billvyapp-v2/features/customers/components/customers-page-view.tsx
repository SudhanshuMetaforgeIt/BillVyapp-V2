'use client';
import dynamic from 'next/dynamic';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useCustomers } from '../hooks/use-customers';
import type {
  CustomerGender,
  CustomerListRow,
  CustomerStatusFilter,
  PaginationMeta,
} from '../types/customers.types';
const LazyCreateCustomerDialog = dynamic(() => import('./create-customer-dialog').then((module) => module.CreateCustomerDialog), { loading: () => <p role="status">Opening dialog…</p> });
function CreateCustomerDialog(props: import('react').ComponentProps<typeof import('./create-customer-dialog').CreateCustomerDialog>) {
  return props.open ? <LazyCreateCustomerDialog {...props} /> : null;
}
import { CustomersFilters } from './customers-filters';
import { CustomersTable } from './customers-table';

const PAGE_SIZE = 10;
const EMPTY_ROWS: CustomerListRow[] = [];
const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export function CustomersPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [membershipPlanId, setMembershipPlanId] = useState('');
  const [gender, setGender] = useState<'' | CustomerGender>('');
  const [status, setStatus] = useState<CustomerStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, membershipPlanId, gender, status]);

  const query = useCustomers({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    gender,
    status,
    membershipPlanId,
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
          title="Customers unavailable"
          message="We could not load customers. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;

  const handlePageChange = useCallback((next: number) => {
    startTransition(() => setPage(next));
  }, [startTransition]);

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
          className="xl:grid-cols-4"
          skeletonCount={4}
        />

        <div className="space-y-4">
          <CustomersFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            membershipPlanId={membershipPlanId}
            onMembershipPlanIdChange={(value) => {
              startTransition(() => setMembershipPlanId(value));
            }}
            planOptions={data?.planOptions ?? []}
            gender={gender}
            onGenderChange={(value) => {
              startTransition(() => setGender(value));
            }}
            status={status}
            onStatusChange={(value) => {
              startTransition(() => setStatus(value));
            }}
            onAddCustomer={() => setCreateOpen(true)}
          />

          <CustomersTable
            rows={data?.rows ?? EMPTY_ROWS}
            meta={data?.meta ?? EMPTY_META}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
