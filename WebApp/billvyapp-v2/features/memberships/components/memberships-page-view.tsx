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
import { useCurrentUser } from '@/hooks/use-current-user';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useMemberships } from '../hooks/use-memberships';
import type {
  MembershipStatusFilter,
  MembershipsTab,
} from '../types/memberships.types';
import { AddMemberDialog } from './add-member-dialog';
import { AddPlanDialog } from './add-plan-dialog';
import { MembersTable } from './members-table';
import { MembershipsFilters } from './memberships-filters';
import { MembershipsSummaryCards } from './memberships-summary-cards';
import { MembershipsTabs } from './memberships-tabs';
import { PlansTable } from './plans-table';

const PAGE_SIZE = 10;

export function MembershipsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const user = useCurrentUser();
  const salonId = user?.salonId ?? '';

  const [tab, setTab] = useState<MembershipsTab>('members');
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<MembershipStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addPlanOpen, setAddPlanOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, planId, status, tab]);

  const query = useMemberships({
    tab,
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    planId,
    status,
  });

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess, tab], scope: rootRef },
  );

  if (!salonId) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Salon not linked"
          message="Your account is not linked to a salon, so memberships cannot be managed."
        />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Memberships unavailable"
          message="We could not load memberships. Please try again."
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

        <div
          className="app-surface-card overflow-hidden"
          data-dash-animate="section"
        >
          <MembershipsTabs
            value={tab}
            onChange={(value) => {
              startTransition(() => {
                setTab(value);
                setSearchInput('');
                setPlanId('');
                setStatus('all');
              });
            }}
          />

          <div className="space-y-4 p-4 sm:p-5">
            <MembershipsFilters
              tab={tab}
              search={searchInput}
              onSearchChange={setSearchInput}
              planId={planId}
              onPlanIdChange={(value) => {
                startTransition(() => setPlanId(value));
              }}
              planOptions={data?.planOptions ?? []}
              status={status}
              onStatusChange={(value) => {
                startTransition(() => setStatus(value));
              }}
              onPrimaryAction={() => {
                if (tab === 'members') setAddMemberOpen(true);
                else setAddPlanOpen(true);
              }}
            />

            {tab === 'members' ? (
              <MembersTable
                rows={data?.memberRows ?? []}
                meta={data?.memberMeta ?? emptyMeta}
                isLoading={query.isLoading && !data}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                onPageChange={(next) => {
                  startTransition(() => setPage(next));
                }}
              />
            ) : (
              <PlansTable
                rows={data?.planRows ?? []}
                meta={data?.planMeta ?? emptyMeta}
                isLoading={query.isLoading && !data}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                onPageChange={(next) => {
                  startTransition(() => setPage(next));
                }}
              />
            )}
          </div>
        </div>

        <MembershipsSummaryCards
          popularPlans={data?.popularPlans ?? []}
          monthSummary={
            data?.monthSummary ?? {
              newMemberships: 0,
              renewedLabel: '—',
              revenueLabel: '—',
              visitsLabel: '—',
              incomplete: false,
            }
          }
          onViewPlans={() => {
            startTransition(() => setTab('plans'));
          }}
        />
      </div>

      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        planOptions={data?.planOptions ?? []}
        customerOptions={data?.customerOptions ?? []}
      />

      <AddPlanDialog
        open={addPlanOpen}
        onOpenChange={setAddPlanOpen}
        salonId={salonId}
      />
    </>
  );
}
