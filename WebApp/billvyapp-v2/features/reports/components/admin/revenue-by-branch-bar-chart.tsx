'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RevenueByBranchItem } from '../../types/admin-reports.types';

type RevenueByBranchBarChartProps = {
  items: RevenueByBranchItem[];
};

export function RevenueByBranchBarChart({ items }: RevenueByBranchBarChartProps) {
  const [period, setPeriod] = useState('This Month');

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const maxVal = Math.max(...items.map((i) => i.revenue), 10000);
  const ceilMax = Math.ceil(maxVal / 100000) * 100000 || 600000;

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Revenue by Branch
        </h3>
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-7 rounded-md border border-stone-200 bg-white pl-2 pr-6 text-[11px] font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300 appearance-none"
          >
            <option value="This Month">This Month</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Year">This Year</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 w-full">
        {items.length === 0 ? (
          <div className="py-16 text-center text-xs text-stone-400">
            No branch revenue data recorded yet.
          </div>
        ) : (
          <div className="relative pt-6 pb-2">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[10px] text-stone-400">
              {[1, 0.66, 0.33, 0].map((pct, i) => {
                const labelVal = Math.round(ceilMax * pct);
                const label =
                  labelVal >= 100000
                    ? `₹${(labelVal / 100000).toFixed(1).replace('.0', '')}L`
                    : `₹0`;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-8 text-right shrink-0">{label}</span>
                    <div className="flex-1 border-b border-dashed border-stone-100 dark:border-stone-800" />
                  </div>
                );
              })}
            </div>

            {/* Bars */}
            <div className="relative z-10 pl-10 pr-2 flex items-end justify-around gap-4 h-48">
              {items.map((b) => {
                const heightPct =
                  ceilMax > 0
                    ? Math.max(4, Math.min(100, (b.revenue / ceilMax) * 100))
                    : 4;
                return (
                  <div
                    key={b.branchName}
                    className="flex flex-col items-center flex-1 max-w-[64px]"
                  >
                    {/* Amount label above bar */}
                    <span className="text-[10px] font-semibold text-stone-700 dark:text-stone-300 mb-1 whitespace-nowrap">
                      {formatINR(b.revenue)}
                    </span>

                    {/* Bar */}
                    <div className="w-full h-32 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full rounded-t-md bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer shadow-xs"
                        title={`${b.branchName}: ${formatINR(b.revenue)}`}
                      />
                    </div>

                    {/* Branch name below bar */}
                    <span className="mt-2 text-[10px] font-medium text-stone-500 dark:text-stone-400 text-center truncate w-full">
                      {b.branchName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
