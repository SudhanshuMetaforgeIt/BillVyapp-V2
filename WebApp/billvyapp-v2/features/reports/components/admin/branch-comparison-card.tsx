'use client';

import { useState } from 'react';
import { Building2, ChevronDown, TrendingUp } from 'lucide-react';
import type { BranchComparisonItem } from '../../types/admin-reports.types';

type BranchComparisonCardProps = {
  items: BranchComparisonItem[];
};

export function BranchComparisonCard({ items }: BranchComparisonCardProps) {
  const [metric, setMetric] = useState<'Revenue' | 'Bills' | 'Customers'>('Revenue');

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Branch Comparison
        </h3>
        <div className="relative">
          <select
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as 'Revenue' | 'Bills' | 'Customers')
            }
            className="h-7 rounded-md border border-stone-200 bg-white pl-2 pr-6 text-[11px] font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300 appearance-none"
          >
            <option value="Revenue">Revenue</option>
            <option value="Bills">Bills</option>
            <option value="Customers">Customers</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
        </div>
      </div>

      {/* List */}
      <div className="mt-4 space-y-3.5">
        {items.length === 0 ? (
          <div className="text-xs text-stone-400 py-6 text-center">
            No branch comparison data recorded yet.
          </div>
        ) : (
          items.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-900/10 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {b.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-stone-900 dark:text-white">
                  {formatINR(b.revenue)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {b.growth}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
