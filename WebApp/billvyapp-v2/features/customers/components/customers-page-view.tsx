'use client';

import {
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
  CustomerStatusFilter,
} from '../types/customers.types';
import { CreateCustomerDialog } from './create-customer-dialog';
import { CustomersFilters } from './customers-filters';
import { CustomersTable } from './customers-table';

const PAGE_SIZE = 10;

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
  const emptyMeta = {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

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
      </div>

      <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
