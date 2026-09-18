'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import {
  useManagerNotifications,
  useMarkNotificationsRead,
} from '../hooks/use-notifications';
import type { ManagerNotificationTab } from '../types/notifications.types';
import { ManagerNotificationsTable } from './manager-notifications-table';

const PAGE_SIZE = 8;

export function ManagerNotificationsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<ManagerNotificationTab>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const query = useManagerNotifications({
    page,
    limit: PAGE_SIZE,
    tab,
  });
  const markRead = useMarkNotificationsRead();

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess, tab], scope: rootRef },
  );

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Notifications unavailable"
          message="We could not load notifications. Please try again."
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
        className="xl:grid-cols-4"
        skeletonCount={4}
      />

      <ManagerNotificationsTable
        rows={data?.rows ?? []}
        meta={data?.meta ?? emptyMeta}
        tab={tab}
        onTabChange={(value) => {
          startTransition(() => setTab(value));
        }}
        isLoading={query.isLoading && !data}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        onPageChange={(next) => {
          startTransition(() => setPage(next));
        }}
        canMarkAll={(data?.markableIds.length ?? 0) > 0}
        markAllPending={markRead.isPending}
        onMarkAllRead={() => {
          if (!data?.markableIds.length) return;
          markRead.mutate(data.markableIds);
        }}
      />
    </div>
  );
}
