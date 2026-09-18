'use client';

import { CheckCircle2, Clock, IndianRupee, Store, Users } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AdminBusinessStats } from '../../types/admin-my-business.types';

type AdminBusinessStatsProps = {
  stats?: AdminBusinessStats;
  isLoading?: boolean;
};

export function AdminBusinessStatsCards({ stats, isLoading }: AdminBusinessStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="app-surface-card p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const activePercent =
    stats.totalBranches > 0
      ? Math.round((stats.activeBranches / stats.totalBranches) * 100)
      : 0;
  const inactivePercent =
    stats.totalBranches > 0
      ? Math.round((stats.inactiveBranches / stats.totalBranches) * 100)
      : 0;

  const cards = [
    {
      id: 'total-branches',
      label: 'Total Branches',
      value: stats.totalBranches.toLocaleString('en-IN'),
      subtext: 'All Locations',
      subtextClass: 'text-text-secondary',
      icon: Store,
      iconClass: 'bg-amber-100/80 text-amber-700',
    },
    {
      id: 'active-branches',
      label: 'Active Branches',
      value: stats.activeBranches.toLocaleString('en-IN'),
      subtext: stats.totalBranches > 0 ? `${activePercent}% of total` : '0% of total',
      subtextClass: 'text-emerald font-medium',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-100/80 text-emerald-700',
    },
    {
      id: 'inactive-branches',
      label: 'Inactive Branches',
      value: stats.inactiveBranches.toLocaleString('en-IN'),
      subtext: stats.totalBranches > 0 ? `${inactivePercent}% of total` : '0% of total',
      subtextClass: stats.inactiveBranches > 0 ? 'text-danger font-medium' : 'text-text-secondary',
      icon: Clock,
      iconClass: 'bg-purple-100/80 text-purple-700',
    },
    {
      id: 'total-staff',
      label: 'Total Staff',
      value: stats.totalStaff.toLocaleString('en-IN'),
      subtext: 'Across all branches',
      subtextClass: 'text-text-secondary',
      icon: Users,
      iconClass: 'bg-blue-100/80 text-blue-700',
    },
    {
      id: 'revenue-month',
      label: 'Revenue (This Month)',
      value: `₹${stats.revenueMonth.toLocaleString('en-IN')}`,
      subtext: stats.revenueMonth > 0 ? 'current period' : 'vs last month',
      subtextClass: 'text-emerald font-medium',
      icon: IndianRupee,
      iconClass: 'bg-amber-100/80 text-amber-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="app-surface-card app-surface-card-interactive flex items-start gap-3.5 p-4 sm:p-5"
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11',
                c.iconClass,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text-secondary sm:text-sm">
                {c.label}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-text sm:text-2xl">
                {c.value}
              </p>
              <p className={cn('mt-0.5 truncate text-xs', c.subtextClass)}>{c.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
