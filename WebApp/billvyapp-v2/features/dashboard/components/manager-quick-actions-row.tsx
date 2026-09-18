'use client';

import Link from 'next/link';

import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { MANAGER_QUICK_ACTIONS } from '../constants/quick-actions';

type ManagerQuickActionsRowProps = {
  isLoading?: boolean;
};

export function ManagerQuickActionsRow({
  isLoading,
}: ManagerQuickActionsRowProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {MANAGER_QUICK_ACTIONS.map((action, index) => {
        const Icon = action.icon;
        const primary = index === 0;
        return (
          <Link
            key={action.id}
            href={action.href}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-5 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne',
              primary
                ? 'border-charcoal bg-charcoal text-white shadow-sm hover:bg-charcoal/90'
                : 'border-border bg-surface text-text hover:border-champagne/40 hover:bg-champagne-light/60',
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span>{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function ManagerMembershipsCta() {
  return (
    <aside className="app-surface-card flex flex-col justify-between gap-4 p-5">
      <div>
        <p className="text-sm font-medium text-champagne">Memberships</p>
        <h3 className="mt-1 text-lg font-semibold text-text">
          Grow with Memberships
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Encourage repeat visits with membership plans tailored to your salon.
        </p>
      </div>
      <Link
        href={ROUTES.dashboard.manager.memberships}
        className="inline-flex items-center justify-center rounded-xl bg-champagne px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-champagne/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
      >
        Manage Memberships
      </Link>
    </aside>
  );
}
