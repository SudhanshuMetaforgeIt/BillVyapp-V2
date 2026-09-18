'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { cn } from '@/lib/utils';
import type { AdminQuickAction } from '../types/admin-dashboard.types';

type AdminQuickActionsProps = {
  actions: AdminQuickAction[];
};

export function AdminQuickActions({ actions }: AdminQuickActionsProps) {
  return (
    <DashboardSectionCard
      title="Quick Actions"
      data-dash-animate="section"
      bodyClassName="p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne',
                action.primary
                  ? 'auth-cta border-transparent text-white col-span-2'
                  : 'border-border bg-surface text-text hover:border-champagne/50 hover:bg-champagne-light/40',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
                  action.primary
                    ? 'bg-white/20'
                    : 'bg-champagne-light text-champagne ring-1 ring-champagne/15 transition group-hover:ring-champagne/30',
                )}
              >
                <Icon
                  className={cn('size-3.5', action.primary ? 'text-white' : 'text-champagne')}
                  aria-hidden
                />
              </span>
              <span className="flex-1">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </DashboardSectionCard>
  );
}
