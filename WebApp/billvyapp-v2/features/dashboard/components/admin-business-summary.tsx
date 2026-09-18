'use client';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { cn } from '@/lib/utils';
import type { AdminSummaryItem, StatTone } from '../types/admin-dashboard.types';

const ICON_TONE_CLASS: Record<StatTone, string> = {
  orange: 'bg-brand-orange/10 text-brand-orange',
  emerald: 'bg-emerald-light text-emerald',
  champagne: 'bg-champagne-light text-champagne',
  danger: 'bg-[color-mix(in_srgb,var(--bv-danger)_12%,white)] text-danger',
  info: 'bg-[color-mix(in_srgb,#2563eb_10%,white)] text-[#2563eb]',
  neutral: 'bg-muted text-text-secondary',
};

type AdminBusinessSummaryProps = {
  items: AdminSummaryItem[];
};

export function AdminBusinessSummary({ items }: AdminBusinessSummaryProps) {
  return (
    <DashboardSectionCard
      title="Business Summary"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-ivory/60 transition-colors"
            >
              <span
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                  ICON_TONE_CLASS[item.tone],
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-medium text-text">{item.label}</span>
              <span className="shrink-0 text-sm font-bold text-text">{item.value}</span>
            </li>
          );
        })}
      </ul>
    </DashboardSectionCard>
  );
}
