'use client';

import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useNotifications } from '../hooks/use-notifications';
import { defaultNotificationsDateRange } from '../services/notifications.service';
import type {
  NotificationChannelFilter,
  NotificationStatusFilter,
} from '../types/notifications.types';
import { CreateNotificationDialog } from './create-notification-dialog';
import { NotificationsFilters } from './notifications-filters';
import { NotificationsSidebar } from './notifications-sidebar';
import { NotificationsTable } from './notifications-table';

const PAGE_SIZE = 8;

export function NotificationsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const defaults = defaultNotificationsDateRange();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [channel, setChannel] = useState<NotificationChannelFilter>('all');
  const [status, setStatus] = useState<NotificationStatusFilter>('all');
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, channel, status, dateFrom, dateTo]);

  const query = useNotifications({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    channel,
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
          title="Notifications unavailable"
          message="We could not load system notifications. Please try again."
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
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
          <div className="space-y-4">
            <NotificationsFilters
              search={searchInput}
              channel={channel}
              status={status}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onSearchChange={setSearchInput}
              onChannelChange={(value) => {
                startTransition(() => setChannel(value));
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
              onSend={() => setCreateOpen(true)}
            />

            <NotificationsTable
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

          <NotificationsSidebar
            totalCount={data?.totalCount ?? 0}
            summary={data?.summary ?? []}
            isLoading={query.isLoading && !data}
            onSend={() => setCreateOpen(true)}
          />
        </div>
      </div>

      <CreateNotificationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
