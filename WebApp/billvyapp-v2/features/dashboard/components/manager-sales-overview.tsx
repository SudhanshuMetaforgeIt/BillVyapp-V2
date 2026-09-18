'use client';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency } from '@/lib/format';
import type { SalesDayPoint } from '../services/dashboard.service';

type ManagerSalesOverviewProps = {
  series: SalesDayPoint[];
  isLoading?: boolean;
};

export function ManagerSalesOverview({
  series,
  isLoading,
}: ManagerSalesOverviewProps) {
  const max = Math.max(
    ...series.flatMap((p) => [p.thisWeek, p.lastWeek]),
    1,
  );
  const hasData = series.length > 0 && series.some((p) => p.thisWeek > 0 || p.lastWeek > 0);

  return (
    <DashboardSectionCard
      title="Sales Overview"
      data-dash-animate="section"
      className="h-full"
      action={
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-champagne" aria-hidden />
            This Week
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full border border-text-secondary/50 bg-transparent"
              aria-hidden
            />
            Last Week
          </span>
        </div>
      }
      bodyClassName="pt-4"
    >
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : !hasData ? (
        <SectionEmptyState message="No sales data for this period." />
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 640 240"
            role="img"
            aria-label="Sales this week versus last week"
            className="h-56 w-full min-w-[320px]"
          >
            <title>Sales overview</title>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = 20 + (1 - t) * 160;
              return (
                <g key={t}>
                  <line
                    x1={48}
                    x2={620}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={40}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[var(--bv-text-secondary)]"
                    fontSize={10}
                  >
                    {formatCompactCurrency(max * t)}
                  </text>
                </g>
              );
            })}

            {(() => {
              const coords = series.map((point, index) => {
                const x = 64 + (index / Math.max(series.length - 1, 1)) * 520;
                return {
                  ...point,
                  x,
                  thisY: 20 + (1 - point.thisWeek / max) * 160,
                  lastY: 20 + (1 - point.lastWeek / max) * 160,
                };
              });

              const thisLine = coords
                .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.thisY}`)
                .join(' ');
              const lastLine = coords
                .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.lastY}`)
                .join(' ');

              return (
                <>
                  <path
                    d={lastLine}
                    fill="none"
                    stroke="var(--bv-text-secondary)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.55}
                  />
                  <path
                    d={thisLine}
                    fill="none"
                    stroke="var(--bv-champagne)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {coords.map((c) => (
                    <g key={c.dateKey}>
                      <circle
                        cx={c.x}
                        cy={c.thisY}
                        r={4}
                        fill="var(--bv-champagne)"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                      <text
                        x={c.x}
                        y={210}
                        textAnchor="middle"
                        fontSize={11}
                        className="fill-[var(--bv-text-secondary)]"
                      >
                        {c.label}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      )}
    </DashboardSectionCard>
  );
}
