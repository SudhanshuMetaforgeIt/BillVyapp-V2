'use client';

import { useMemo, useState } from 'react';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency } from '@/lib/format';
import type { RevenuePoint } from '../data/placeholders';

type RevenueOverviewProps = {
  series: RevenuePoint[];
  isLoading?: boolean;
  isPlaceholder?: boolean;
};

const RANGES = [
  { id: '6m', label: 'Last 6 Months' },
  { id: '3m', label: 'Last 3 Months' },
] as const;

export function RevenueOverview({
  series,
  isLoading,
  isPlaceholder,
}: RevenueOverviewProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('6m');

  const points = useMemo(() => {
    if (range === '3m') return series.slice(-3);
    return series.slice(-6);
  }, [range, series]);

  const max = Math.max(...points.map((p) => p.amount), 1);

  return (
    <DashboardSectionCard
      title="Revenue Overview"
      data-dash-animate="section"
      className="h-full"
      action={
        <select
          id="revenue-range"
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          aria-label="Revenue time range"
          className="rounded-lg border border-border bg-ivory-soft px-2.5 py-1.5 text-xs font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          {RANGES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      }
      bodyClassName="pt-4"
    >
      {isPlaceholder ? (
        <p className="mb-3 text-xs text-text-secondary">
          Chart uses placeholder series until analytics API is available.
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : points.length === 0 ? (
        <SectionEmptyState message="No revenue data for this period." />
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 640 240"
            role="img"
            aria-label="Revenue over selected months"
            className="h-56 w-full min-w-[320px]"
          >
            <title>Revenue overview</title>
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
              const coords = points.map((point, index) => {
                const x =
                  64 + (index / Math.max(points.length - 1, 1)) * 520;
                const y = 20 + (1 - point.amount / max) * 160;
                return { ...point, x, y };
              });

              const line = coords
                .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
                .join(' ');

              return (
                <>
                  <path
                    d={line}
                    fill="none"
                    stroke="var(--bv-champagne)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {coords.map((c) => (
                    <g key={c.monthKey}>
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={4.5}
                        fill="var(--bv-champagne)"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                      <text
                        x={c.x}
                        y={c.y - 12}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        className="fill-[var(--bv-text)]"
                      >
                        {formatCompactCurrency(c.amount)}
                      </text>
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
