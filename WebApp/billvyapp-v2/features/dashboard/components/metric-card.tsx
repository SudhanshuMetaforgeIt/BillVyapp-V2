'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Building2, IndianRupee, UserRound, BadgeCheck } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  formatNumber,
  formatPercentChange,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DashboardMetric, MetricTone } from '../services/dashboard.service';

const METRIC_ICONS: Record<string, LucideIcon> = {
  'total-businesses': Building2,
  'active-businesses': BadgeCheck,
  'total-users': UserRound,
  'revenue-month': IndianRupee,
};

const TONE_ICON_WRAP: Record<MetricTone, string> = {
  accent: 'bg-champagne-light text-champagne',
  success: 'bg-emerald-light text-emerald',
  neutral: 'bg-muted text-charcoal-soft',
};

type MetricCardProps = {
  metric: DashboardMetric;
  className?: string;
};

export function MetricCard({ metric, className }: MetricCardProps) {
  const Icon = METRIC_ICONS[metric.id] ?? Building2;
  const isCurrency = metric.id === 'revenue-month';
  const displayValue = isCurrency
    ? formatCurrency(metric.rawValue)
    : formatNumber(metric.rawValue);

  const change = metric.changePercent;
  const positive = change !== null && change >= 0;
  const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className={cn(
        'app-surface-card app-surface-card-interactive app-metric-card p-5',
        className,
      )}
      data-dash-animate="metric"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-secondary">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
            {displayValue}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
            TONE_ICON_WRAP[metric.tone],
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
            {formatPercentChange(change)}
          </span>
          <span className="text-text-secondary">{metric.comparisonLabel}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">
          {metric.comparisonIsPlaceholder
            ? 'Comparison unavailable'
            : 'Current period total'}
        </p>
      )}
    </article>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="app-surface-card app-metric-card space-y-3 p-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}

type MetricGridProps = {
  metrics: DashboardMetric[];
  isLoading?: boolean;
};

export function MetricGrid({ metrics, isLoading }: MetricGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
