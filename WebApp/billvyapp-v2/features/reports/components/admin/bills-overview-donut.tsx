'use client';

import type { BillsOverviewSummary } from '../../types/admin-reports.types';

type BillsOverviewDonutProps = {
  summary: BillsOverviewSummary;
};

export function BillsOverviewDonut({ summary }: BillsOverviewDonutProps) {
  const total = summary.total;
  const paid = summary.paid;
  const pending = summary.pending;
  const overdue = summary.overdue;
  const cancelled = summary.cancelled;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const getArcs = () => {
    if (total === 0) {
      return [{ color: '#e7e5e4', strokeDasharray: `${circumference} 0`, offset: 0 }];
    }

    const segments = [
      { count: paid, color: '#22c55e' }, // Green
      { count: pending, color: '#f59e0b' }, // Amber
      { count: overdue, color: '#ef4444' }, // Red
      { count: cancelled, color: '#a8a29e' }, // Gray
    ];

    let currentOffset = 0;
    return segments
      .filter((s) => s.count > 0)
      .map((seg) => {
        const strokeLength = (seg.count / total) * circumference;
        const arc = {
          color: seg.color,
          strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
          offset: -currentOffset,
        };
        currentOffset += strokeLength;
        return arc;
      });
  };

  const arcs = getArcs();

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
        Bills Overview
      </h3>

      <div className="mt-4 flex min-w-0 flex-1 flex-col items-center justify-center gap-4">
        {/* Donut Chart */}
        <div className="relative flex size-28 shrink-0 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="fill-transparent stroke-stone-100 dark:stroke-stone-800"
              strokeWidth="10"
            />
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={arc.color}
                strokeWidth="10"
                strokeDasharray={arc.strokeDasharray}
                strokeDashoffset={arc.offset}
                strokeLinecap="round"
              />
            ))}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
            <span className="text-sm font-bold tabular-nums tracking-tight text-stone-900 dark:text-white">
              {total.toLocaleString('en-IN')}
            </span>
            <span className="max-w-[4.5rem] text-[9px] leading-tight text-stone-400">
              Total Bills
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full min-w-0 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate font-medium text-stone-600 dark:text-stone-400">Paid</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-stone-800 dark:text-stone-200">
              {paid.toLocaleString('en-IN')}{' '}
              <span className="font-normal text-stone-400">({summary.paidPct}%)</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span className="truncate font-medium text-stone-600 dark:text-stone-400">Partially paid</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-stone-800 dark:text-stone-200">
              {pending.toLocaleString('en-IN')}{' '}
              <span className="font-normal text-stone-400">({summary.pendingPct}%)</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
              <span className="truncate font-medium text-stone-600 dark:text-stone-400">Unpaid</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-stone-800 dark:text-stone-200">
              {overdue.toLocaleString('en-IN')}{' '}
              <span className="font-normal text-stone-400">({summary.overduePct}%)</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
              <span className="truncate font-medium text-stone-600 dark:text-stone-400">Cancelled</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-stone-800 dark:text-stone-200">
              {cancelled.toLocaleString('en-IN')}{' '}
              <span className="font-normal text-stone-400">({summary.cancelledPct}%)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
