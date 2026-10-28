'use client';

import { CurrencyIcon } from '@/components/ui/currency-icon';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Skeleton } from '@/components/ui/skeleton';

import { getBusinessRegion } from '@/lib/business-region';

import {
  CalendarOff,
  CheckCircle2,
  UserMinus,
  Users,
} from 'lucide-react';
import type { StaffStats } from '../types/staff.types';

type StaffStatsProps = {
  stats: StaffStats;
  loading?: boolean;
};

export function StaffStats({ stats, loading }: StaffStatsProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat(getBusinessRegion().locale, {
      style: 'currency',
      currency: getBusinessRegion().currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      id: 'total-staff',
      label: 'Total Staff',
      value: <AnimatedNumber value={stats.totalStaff} />,
      subtitle: 'Across all branches',
      subtitleColor: 'text-stone-500 dark:text-stone-400',
      icon: Users,
      iconBg:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'active-staff',
      label: 'Active Staff',
      value: <AnimatedNumber value={stats.activeStaff} />,
      subtitle: `${stats.activeStaffPct}% of total`,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      iconBg:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      id: 'on-leave',
      label: 'On Leave',
      value: stats.onLeave == null ? '—' : <AnimatedNumber value={stats.onLeave} />,
      subtitle: stats.onLeavePct === null ? 'Leave data unavailable' : `${stats.onLeavePct}% of total`,
      subtitleColor: 'text-rose-600 dark:text-rose-400',
      icon: CalendarOff,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    },
    {
      id: 'inactive-staff',
      label: 'Inactive Staff',
      value: <AnimatedNumber value={stats.inactiveStaff} />,
      subtitle: `${stats.inactiveStaffPct}% of total`,
      subtitleColor: 'text-amber-600 dark:text-amber-400',
      icon: UserMinus,
      iconBg:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'total-payroll',
      label: 'Total Payroll (This Month)',
      value: <AnimatedNumber value={stats.totalPayrollThisMonth} format={formatINR} />,
      subtitle: 'Across all branches',
      subtitleColor: 'text-stone-500 dark:text-stone-400',
      icon: CurrencyIcon,
      iconBg:
        'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    },
  ];

  return (
    <div className="app-staff-stats-grid app-stat-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="app-staff-stat-card app-metric-card rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div
              className={`app-staff-stat-icon flex size-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <Icon className="size-5" />
            </div>

            <div className="contents">
              <span className="app-staff-stat-label block text-xs font-medium text-stone-500 dark:text-stone-400">
                {card.label}
              </span>
              <div className="app-staff-stat-value font-bold tracking-tight text-stone-900 dark:text-white">
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  card.value
                )}
              </div>
              <div className="app-staff-stat-caption">
                <span
                  className={`text-[11px] font-medium ${card.subtitleColor}`}
                >
                  {card.subtitle}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
