'use client';

import {
  CalendarClock,
  ChevronRight,
  History,
  LayoutTemplate,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import type { NotificationSummarySlice } from '../types/notifications.types';
import { NotificationsStatusDonut } from './notifications-status-donut';

type NotificationsSidebarProps = {
  totalCount: number;
  summary: NotificationSummarySlice[];
  isLoading?: boolean;
  onSend: () => void;
};

const QUICK_ACTIONS = [
  {
    id: 'send',
    label: 'Send Notification',
    description: 'Queue a new message',
    icon: Send,
    action: 'send' as const,
  },
  {
    id: 'templates',
    label: 'Notification Templates',
    description: 'Reusable message templates',
    icon: LayoutTemplate,
    action: 'toast' as const,
  },
  {
    id: 'scheduled',
    label: 'Scheduled Notifications',
    description: 'View upcoming deliveries',
    icon: CalendarClock,
    action: 'toast' as const,
  },
  {
    id: 'history',
    label: 'Notification History',
    description: 'Browse past deliveries',
    icon: History,
    action: 'toast' as const,
  },
];

export function NotificationsSidebar({
  totalCount,
  summary,
  isLoading,
  onSend,
}: NotificationsSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Notification Overview"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : totalCount === 0 ? (
          <SectionEmptyState
            title="No notifications yet"
            message="Overview will appear once notifications are sent."
            className="py-6"
          />
        ) : (
          <NotificationsStatusDonut total={totalCount} slices={summary} />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Quick Actions"
        data-dash-animate="section"
        bodyClassName="space-y-1 p-3"
      >
        <ul className="space-y-1">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (action.action === 'send') {
                      onSend();
                      return;
                    }
                    toast(
                      `${action.label} will be available once additional notification APIs are connected.`,
                    );
                  }}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{action.label}</span>
                    <span className="block text-xs font-normal text-text-secondary">
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 text-text-secondary transition group-hover:text-charcoal"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Notification Preferences"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        <SectionEmptyState
          title="Preferences unavailable"
          message="Delivery preferences will appear when a preferences API is available."
          className="py-4"
        />
      </DashboardSectionCard>
    </div>
  );
}
