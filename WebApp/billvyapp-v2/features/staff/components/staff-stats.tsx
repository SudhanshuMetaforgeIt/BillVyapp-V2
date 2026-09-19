'use client';

import {
  CalendarOff,
  CheckCircle2,
  IndianRupee,
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      id: 'total-staff',
      label: 'Total Staff',
      value: stats.totalStaff.toLocaleString('en-IN'),
      subtitle: 'Across all branches',
      subtitleColor: 'text-stone-500 dark:text-stone-400',
      icon: Users,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'active-staff',
      label: 'Active Staff',
      value: stats.activeStaff.toLocaleString('en-IN'),
      subtitle: `${stats.activeStaffPct}% of total`,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      id: 'on-leave',
      label: 'On Leave',
      value: stats.onLeave.toLocaleString('en-IN'),
      subtitle: `${stats.onLeavePct}% of total`,
      subtitleColor: 'text-rose-600 dark:text-rose-400',
      icon: CalendarOff,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    },
    {
      id: 'inactive-staff',
      label: 'Inactive Staff',
      value: stats.inactiveStaff.toLocaleString('en-IN'),
      subtitle: `${stats.inactiveStaffPct}% of total`,
      subtitleColor: 'text-amber-600 dark:text-amber-400',
      icon: UserMinus,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'total-payroll',
      label: 'Total Payroll (This Month)',
      value: formatINR(stats.totalPayrollThisMonth),
      subtitle: 'Across all branches',
      subtitleColor: 'text-stone-500 dark:text-stone-400',
      icon: IndianRupee,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="flex items-start gap-4 rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                {card.label}
              </span>
              <div className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-white truncate">
                {loading ? (
                  <div className="h-7 w-16 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                ) : (
                  card.value
                )}
              </div>
              <div className="mt-1.5">
                <span className={`text-[11px] font-medium ${card.subtitleColor}`}>
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
