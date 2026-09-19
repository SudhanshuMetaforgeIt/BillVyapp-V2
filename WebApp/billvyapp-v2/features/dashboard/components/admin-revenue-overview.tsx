'use client';

import { useState } from 'react';

import { DashboardSectionCard, SectionEmptyState } from '@/components/layout/section-states';
import { formatCompactCurrency } from '@/lib/format';
import type { AdminRevenuePoint } from '../types/admin-dashboard.types';

type AdminRevenueOverviewProps = {
  series: AdminRevenuePoint[];
};

const PERIODS = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'today', label: 'Today' },
] as const;

export function AdminRevenueOverview({ series }: AdminRevenueOverviewProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('week');

  const points = period === 'week' ? series.slice(-7) : series;
  const max = Math.max(...points.map((p) => p.amount), 1);

  return (
    <DashboardSectionCard
      title="Revenue Overview"
      data-dash-animate="section"
      className="h-full"
      action={
        <select
          id="admin-revenue-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          aria-label="Revenue period"
          className="rounded-lg border border-border bg-ivory-soft px-2.5 py-1.5 text-xs font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      }
      bodyClassName="pt-2 pb-4"
    >
      <p className="px-5 pb-2 text-xs text-text-secondary">
        Business revenue for the current period
      </p>
      {points.length === 0 ? (
        <SectionEmptyState message="No revenue recorded yet for this period." />
      ) : (
        <div className="w-full overflow-x-auto px-1">
        <svg
          viewBox="0 0 560 220"
          role="img"
          aria-label="Daily revenue chart"
          className="h-52 w-full min-w-[320px]"
        >
          <title>Revenue overview</title>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = 16 + (1 - t) * 152;
            return (
              <g key={t}>
                <line
                  x1={44}
                  x2={540}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray={t === 0 ? undefined : '4 4'}
                />
                <text
                  x={38}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[var(--bv-text-secondary)]"
                  fontSize={9}
                >
                  {formatCompactCurrency(max * t)}
                </text>
              </g>
            );
          })}

          {(() => {
            const coords = points.map((point, index) => {
              const x = 56 + (index / Math.max(points.length - 1, 1)) * 468;
              const y = 16 + (1 - point.amount / max) * 152;
              return { ...point, x, y };
            });

            // Build smooth line path using cubic bezier curves
            const linePath = coords
              .map((c, i) => {
                if (i === 0) return `M ${c.x} ${c.y}`;
                const prev = coords[i - 1];
                const cpx1 = prev.x + (c.x - prev.x) * 0.5;
                const cpx2 = prev.x + (c.x - prev.x) * 0.5;
                return `C ${cpx1} ${prev.y} ${cpx2} ${c.y} ${c.x} ${c.y}`;
              })
              .join(' ');

            // Fill area under line
            const firstX = coords[0]?.x ?? 56;
            const lastX = coords[coords.length - 1]?.x ?? 56;
            const bottomY = 168;
            const fillPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

            return (
              <>
                {/* Fill gradient area */}
                <defs>
                  <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--bv-champagne)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--bv-champagne)" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                <path d={fillPath} fill="url(#adminRevenueGrad)" />

                {/* Line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--bv-champagne)"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Data points */}
                {coords.map((c) => (
                  <g key={c.dayKey}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={4}
                      fill="var(--bv-champagne)"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    {/* X-axis label */}
                    <text
                      x={c.x}
                      y={198}
                      textAnchor="middle"
                      fontSize={10}
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
