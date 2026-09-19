'use client';

import {
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { BillStats } from '../types/bills.types';

type BillsStatsProps = {
  stats: BillStats;
  loading?: boolean;
};

export function BillsStats({ stats, loading }: BillsStatsProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      id: 'total-bills',
      label: 'Total Bills',
      value: stats.totalBills.toLocaleString('en-IN'),
      subtitle: stats.totalBillsChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: FileText,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
      hasTrendIcon: stats.totalBills > 0,
    },
    {
      id: 'paid-bills',
      label: 'Paid Bills',
      value: stats.paidBills.toLocaleString('en-IN'),
      subtitle: `${stats.paidBillsPct}% of total`,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      id: 'pending-bills',
      label: 'Pending Bills',
      value: stats.pendingBills.toLocaleString('en-IN'),
      subtitle: `${stats.pendingBillsPct}% of total`,
      subtitleColor: 'text-amber-600 dark:text-amber-400',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'overdue-bills',
      label: 'Overdue Bills',
      value: stats.overdueBills.toLocaleString('en-IN'),
      subtitle: `${stats.overdueBillsPct}% of total`,
      subtitleColor: 'text-rose-600 dark:text-rose-400',
      icon: XCircle,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    },
    {
      id: 'total-amount',
      label: 'Total Amount',
      value: formatINR(stats.totalAmount),
      subtitle: stats.totalAmountChange,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: IndianRupee,
      iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      hasTrendIcon: stats.totalAmount > 0,
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
              <div className="mt-1.5 flex items-center gap-1">
                {card.hasTrendIcon && (
                  <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                )}
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
