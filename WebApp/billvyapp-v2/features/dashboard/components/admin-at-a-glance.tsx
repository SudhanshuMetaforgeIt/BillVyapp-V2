'use client';

import { cn } from '@/lib/utils';
import type { AdminGlanceMetric, StatTone } from '../types/admin-dashboard.types';

const ICON_TONE_CLASS: Record<StatTone, string> = {
  orange: 'bg-brand-orange/10 text-brand-orange',
  emerald: 'bg-emerald-light text-emerald',
  champagne: 'bg-champagne-light text-champagne',
  danger: 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger',
  info: 'bg-[color-mix(in_srgb,#2563eb_10%,white)] text-[#2563eb]',
  neutral: 'bg-muted text-text-secondary',
};

type AdminAtAGlanceProps = {
  metrics: AdminGlanceMetric[];
};

export function AdminAtAGlance({ metrics }: AdminAtAGlanceProps) {
  return (
    <section
      className="app-surface-card overflow-hidden"
      data-dash-animate="section"
      aria-label="At a Glance"
    >
      <div className="border-b border-border/80 bg-ivory-soft/50 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-text">At a Glance</h2>
      </div>
      <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x xl:grid-cols-5 xl:divide-x">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className={cn(
                'flex items-center gap-3 px-5 py-4',
                // On mobile, second column items don't get double left-border
                i % 2 === 0 ? 'sm:border-l-0' : '',
                // Subtle hover
                'transition-colors hover:bg-ivory/70',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                  ICON_TONE_CLASS[metric.iconTone],
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-text-secondary">{metric.label}</p>
                <p className="mt-0.5 text-base font-bold tracking-tight text-text">
                  {metric.displayValue}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
