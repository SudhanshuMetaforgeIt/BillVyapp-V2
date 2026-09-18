'use client';

import { useRef } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useManagerDashboard } from '../hooks/use-manager-dashboard';
import { MetricGrid } from './metric-card';
import { ManagerMembershipsCta, ManagerQuickActionsRow } from './manager-quick-actions-row';
import { ManagerPaymentMethods } from './manager-payment-methods';
import { ManagerPendingCollection } from './manager-pending-collection';
import { ManagerRecentBills } from './manager-recent-bills';
import { ManagerSalesOverview } from './manager-sales-overview';
import { ManagerTodayAppointments } from './manager-today-appointments';
import { ManagerTopServices } from './manager-top-services';

export function ManagerDashboardView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useManagerDashboard();

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (query.isError) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Dashboard unavailable"
          message="We could not load your salon overview. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;
  const loading = query.isLoading;

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <MetricGrid
        metrics={data?.metrics ?? []}
        isLoading={loading}
        className="xl:grid-cols-5"
        skeletonCount={5}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)_minmax(16rem,0.9fr)] xl:gap-7">
        <ManagerSalesOverview
          series={data?.salesSeries ?? []}
          isLoading={loading}
        />
        <ManagerPaymentMethods
          slices={data?.paymentMethods ?? []}
          total={data?.paymentMethodsTotal ?? 0}
          isLoading={loading}
        />
        <ManagerTodayAppointments
          rows={data?.todayAppointments ?? []}
          isLoading={loading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)_minmax(16rem,0.85fr)] xl:gap-7">
        <ManagerRecentBills
          rows={data?.recentBills ?? []}
          isLoading={loading}
        />
        <ManagerPendingCollection
          rows={data?.pendingCollection ?? []}
          isLoading={loading}
        />
        <ManagerTopServices
          rows={data?.topServices ?? []}
          isLoading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:gap-7">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">
            Quick Actions
          </h2>
          <ManagerQuickActionsRow isLoading={loading} />
        </div>
        <ManagerMembershipsCta />
      </div>
    </div>
  );
}
