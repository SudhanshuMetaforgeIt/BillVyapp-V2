'use client';

import { useState } from 'react';
import { Bell, Mail, MessageCircle, Smartphone } from 'lucide-react';

import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { NotificationChannel } from '@/types/models';
import { useMyNotifications } from '../hooks/use-customer-portal';
import { NOTIFICATION_STATUS } from './customer-status';
import {
  CustomerEmpty,
  CustomerError,
  CustomerLoading,
  CustomerPageTitle,
  CustomerPagination,
  CustomerPill,
} from './customer-ui';

const CHANNEL_ICON: Record<NotificationChannel, typeof Mail> = {
  EMAIL: Mail,
  SMS: Smartphone,
  WHATSAPP: MessageCircle,
};

export function NotificationsView() {
  const [page, setPage] = useState(1);
  const query = useMyNotifications({ page, limit: 15 });
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-6 pb-16">
      <CustomerPageTitle title="Notifications" subtitle="Messages the salon has sent you" />

      {query.isLoading ? (
        <CustomerLoading label="Loading notifications…" />
      ) : query.isError && !query.data ? (
        <CustomerError error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <CustomerEmpty icon={<Bell className="size-8" />} title="No notifications" message="Booking and bill messages will appear here." />
      ) : (
        <>
          <ul className={cn('space-y-3', query.isFetching && 'opacity-70')}>
            {rows.map((n) => {
              const Icon = CHANNEL_ICON[n.channel];
              const status = NOTIFICATION_STATUS[n.status];
              return (
                <li key={n.id} className="flex gap-3 rounded-2xl border border-[#EDE5D8] bg-white p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E5] text-[#FF7B00]">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#1C1C1E]">{n.subject ?? n.notificationType.replace(/_/g, ' ')}</p>
                      <CustomerPill label={status.label} tone={status.tone} />
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-[#665E55]">{n.message}</p>
                    <p className="mt-2 text-[11px] text-[#8C8375]">{formatDateTime(n.sentAt ?? n.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <CustomerPagination page={page} totalPages={query.data?.meta.totalPages ?? 1} onChange={setPage} disabled={query.isFetching} />
        </>
      )}
    </div>
  );
}
