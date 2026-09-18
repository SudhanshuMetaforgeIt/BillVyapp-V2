'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RevenuePoint } from '../../types/admin-reports.types';

type RevenueOverviewChartProps = {
  series: RevenuePoint[];
};

export function RevenueOverviewChart({ series }: RevenueOverviewChartProps) {
  const [interval, setInterval] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const maxRevenue = Math.max(...series.map((s) => s.revenue), 10000);
  const ceilMax = Math.ceil(maxRevenue / 50000) * 50000 || 200000;

  // Compute SVG coordinates
  const width = 600;
  const height = 220;
  const paddingX = 45;
  const paddingY = 25;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  const points = series.map((s, idx) => {
    const x =
      series.length > 1
        ? paddingX + (idx / (series.length - 1)) * graphWidth
        : width / 2;
    const y =
      height - paddingY - (s.revenue / ceilMax) * graphHeight;
    return { x, y, ...s };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : '';

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Revenue Overview
        </h3>
        <div className="relative">
          <select
            value={interval}
            onChange={(e) =>
              setInterval(e.target.value as 'Daily' | 'Weekly' | 'Monthly')
            }
            className="h-7 rounded-md border border-stone-200 bg-white pl-2 pr-6 text-[11px] font-medium text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300 appearance-none"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="relative mt-4 w-full overflow-x-auto">
        <div className="min-w-[500px]">
          <svg className="w-full h-56" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = height - paddingY - pct * graphHeight;
              const labelVal = Math.round(ceilMax * pct);
              const label =
                labelVal >= 100000
                  ? `₹${(labelVal / 100000).toFixed(1).replace('.0', '')}L`
                  : labelVal >= 1000
                  ? `₹${labelVal / 1000}K`
                  : '₹0';
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    className="stroke-stone-100 dark:stroke-stone-800"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-stone-400 text-[10px]"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area Fill */}
            {areaD && <path d={areaD} fill="url(#revGrad)" />}

            {/* Main Smooth Curve */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Data Points */}
            {points.map((pt, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition hover:r-6"
                />
                <title>{`${pt.date}: ${formatINR(pt.revenue)}`}</title>
                {/* X Axis Label */}
                <text
                  x={pt.x}
                  y={height - 5}
                  textAnchor="middle"
                  className="fill-stone-400 text-[9px]"
                >
                  {pt.date}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
