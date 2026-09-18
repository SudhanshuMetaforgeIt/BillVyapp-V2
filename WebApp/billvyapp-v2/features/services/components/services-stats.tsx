'use client';

import { Ban, CheckCircle2, IndianRupee, Scissors } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ServiceStats } from '../types/services.types';

type ServicesStatsProps = {
  stats?: ServiceStats;
  isLoading?: boolean;
};

export function ServicesStats({ stats, isLoading }: ServicesStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="app-surface-card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const activePercent =
    stats.totalServices > 0
      ? Math.round((stats.activeServices / stats.totalServices) * 100)
      : 0;
  const inactivePercent =
    stats.totalServices > 0
      ? Math.round((stats.inactiveServices / stats.totalServices) * 100)
      : 0;

  const cards = [
    {
      id: 'total-services',
      label: 'Total Services',
      value: stats.totalServices.toLocaleString('en-IN'),
      subtext: 'Across all branches',
      subtextClass: 'text-text-secondary',
      icon: Scissors,
      iconClass: 'bg-amber-100/80 text-amber-700',
    },
    {
      id: 'active-services',
      label: 'Active Services',
      value: stats.activeServices.toLocaleString('en-IN'),
      subtext: stats.totalServices > 0 ? `${activePercent}% of total` : '0% of total',
      subtextClass: 'text-emerald font-medium',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-100/80 text-emerald-700',
    },
    {
      id: 'inactive-services',
      label: 'Inactive Services',
      value: stats.inactiveServices.toLocaleString('en-IN'),
      subtext: stats.totalServices > 0 ? `${inactivePercent}% of total` : '0% of total',
      subtextClass: stats.inactiveServices > 0 ? 'text-danger font-medium' : 'text-text-secondary',
      icon: Ban,
      iconClass: 'bg-rose-100/80 text-rose-700',
    },
    {
      id: 'average-price',
      label: 'Average Price',
      value: `₹${stats.averagePrice.toLocaleString('en-IN')}`,
      subtext: 'Across all services',
      subtextClass: 'text-text-secondary',
      icon: IndianRupee,
      iconClass: 'bg-amber-100/80 text-amber-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
