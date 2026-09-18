'use client';

import { useRef } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { useGSAP } from '@/lib/animations';
import { playDashboardEntrance } from '@/lib/animations';
import { SUPER_ADMIN_QUICK_ACTIONS } from '../constants/quick-actions';
import { useSuperAdminDashboard } from '../hooks/use-super-admin-dashboard';
import { MetricGrid } from './metric-card';
import { QuickActions } from './quick-actions';
import { RecentActivity } from './recent-activity';
import { RecentBusinesses } from './recent-businesses';
import { RevenueOverview } from './revenue-overview';

export function SuperAdminDashboardView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useSuperAdminDashboard();

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
          message="We could not load your platform overview. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <MetricGrid metrics={data?.metrics ?? []} isLoading={query.isLoading} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)] xl:gap-7">
        <div className="space-y-6 xl:space-y-7">
          <RevenueOverview
            series={data?.revenueSeries ?? []}
            isLoading={query.isLoading}
          />
          <RecentBusinesses
            rows={data?.recentBusinesses ?? []}
            isLoading={query.isLoading}
            isError={false}
            onRetry={() => void query.refetch()}
          />
        </div>

        <div className="space-y-6 xl:space-y-7">
          <QuickActions
            actions={SUPER_ADMIN_QUICK_ACTIONS}
            isLoading={query.isLoading}
          />
          <RecentActivity
            items={data?.activity ?? []}
            isLoading={query.isLoading}
            isError={false}
            onRetry={() => void query.refetch()}
          />
        </div>
      </div>
    </div>
  );
}

export function useSuperAdminNotificationCount(): number {
  const query = useSuperAdminDashboard();
  return query.data?.unreadNotifications ?? 0;
}
