'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Bell,
  IndianRupee,
  TriangleAlert,
} from 'lucide-react';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '../services/dashboard.service';

type RecentActivityProps = {
  items: ActivityItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
};

const TONE_WRAP: Record<ActivityItem['tone'], string> = {
  success: 'bg-emerald-light text-emerald',
  accent: 'bg-champagne-light text-champagne',
  warning: 'bg-[color-mix(in_srgb,var(--bv-warning)_14%,white)] text-warning',
  danger: 'bg-[color-mix(in_srgb,var(--bv-danger)_14%,white)] text-danger',
  neutral: 'bg-muted text-text-secondary',
};

function ActivityIcon({ tone }: { tone: ActivityItem['tone'] }) {
  if (tone === 'accent') return <ArrowUpRight className="size-4" aria-hidden />;
  if (tone === 'danger' || tone === 'warning') {
    return <TriangleAlert className="size-4" aria-hidden />;
  }
  if (tone === 'success') return <IndianRupee className="size-4" aria-hidden />;
  return <Bell className="size-4" aria-hidden />;
}

export function RecentActivity({
  items,
  isLoading,
  isError,
  onRetry,
}: RecentActivityProps) {
  return (
    <DashboardSectionCard
      title="Recent Activity"
      data-dash-animate="section"
      bodyClassName="p-0"
    >
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <SectionErrorState
          message="We could not load recent activity."
          onRetry={onRetry}
        />
      ) : items.length === 0 ? (
        <SectionEmptyState message="No recent activity to show." />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-5 py-4">
              <span
                className={cn(
                  'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                  TONE_WRAP[item.tone],
                )}
              >
                <ActivityIcon tone={item.tone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
                  {item.description}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {formatRelative(item.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border px-5 py-3">
        <Link
          href={ROUTES.dashboard.superAdmin.notifications}
          className="text-sm font-semibold text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          View All Activity →
        </Link>
      </div>
    </DashboardSectionCard>
  );
}
