'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AdminStat, StatTone } from '../types/admin-dashboard.types';

const ICON_TONE_CLASS: Record<StatTone, string> = {
  orange: 'bg-brand-orange/10 text-brand-orange',
  emerald: 'bg-emerald-light text-emerald',
  champagne: 'bg-champagne-light text-champagne',
  danger: 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger',
  info: 'bg-[color-mix(in_srgb,#2563eb_10%,white)] text-[#2563eb]',
  neutral: 'bg-muted text-text-secondary',
};

type AdminStatCardProps = {
  stat: AdminStat;
};

export function AdminStatCard({ stat }: AdminStatCardProps) {
  const Icon = stat.icon;
  const change = stat.changePercent;
  const positive = change !== null && change >= 0;
  const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className="app-surface-card app-surface-card-interactive app-metric-card p-5"
      data-dash-animate="metric"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-secondary">{stat.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
            {stat.displayValue}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
            ICON_TONE_CLASS[stat.iconTone],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>

      {change !== null ? (
        <p className="mt-3 flex items-center gap-1 text-sm">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              positive ? 'text-emerald' : 'text-danger',
            )}
          >
            <ChangeIcon className="size-3.5" aria-hidden />
            {positive ? '+' : ''}
            {change.toFixed(1)}%
          </span>
          <span className="text-text-secondary">{stat.comparisonLabel}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">
          {stat.comparisonLabel || 'Current period total'}
        </p>
      )}
    </article>
  );
}

type AdminStatGridProps = {
  stats: AdminStat[];
  isLoading?: boolean;
};

export function AdminStatGrid({ stats, isLoading }: AdminStatGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="app-surface-card p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <AdminStatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
