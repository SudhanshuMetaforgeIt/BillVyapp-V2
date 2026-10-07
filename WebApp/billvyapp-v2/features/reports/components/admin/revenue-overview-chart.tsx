'use client';
import { formatCompactCurrency } from '@/lib/format';
import { useEffect, useId, useRef, useState } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { SelectInput } from '@/components/data/form-fields';
import type { RevenuePoint } from '../../types/admin-reports.types';
import {
  AdminReportPanel,
  reportDate,
  reportMoney,
} from './admin-report-panel';
type Props = {
  series: RevenuePoint[];
  interval: 'day' | 'week' | 'month';
  onIntervalChange: (interval: 'day' | 'week' | 'month') => void;
};
export function RevenueOverviewChart({
  series,
  interval,
  onIntervalChange,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    gradient = useId();
  const [width, setWidth] = useState(640),
    [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(220, entries[0].contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const height = 260,
    left = 52,
    right = 16,
    top = 20,
    bottom = 32;
  const maximum = Math.max(...series.map((r) => r.revenue), 1),
    step = Math.pow(10, Math.floor(Math.log10(maximum))) / 2,
    ceiling = Math.ceil(maximum / step) * step;
  const x = (i: number) =>
    series.length > 1
      ? left + (i / (series.length - 1)) * (width - left - right)
      : (left + width - right) / 2;
  const y = (value: number) =>
    top + (1 - value / ceiling) * (height - top - bottom);
  const points = series.map((row, index) => ({
    ...row,
    x: x(index),
    y: y(row.revenue),
  }));
  const path = points
    .map((p, index) => `${index ? 'L' : 'M'} ${p.x} ${p.y}`)
    .join(' ');
  const focused = active === null ? null : points[active];
  const labelEvery = Math.max(
    1,
    Math.ceil(series.length / Math.max(2, Math.floor(width / 100))),
  );
  const compact = formatCompactCurrency;
  return (
    <AdminReportPanel
      title="Revenue overview"
      description="Collected revenue on completed bills"
      className="h-full"
      action={
        <SelectInput
          aria-label="Revenue interval"
          className="h-9 w-28 text-xs"
          value={interval}
          onChange={(e) =>
            onIntervalChange(e.target.value as Props['interval'])
          }
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </SelectInput>
      }
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-text-secondary">
            Collected in this period
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-text">
            {reportMoney(series.reduce((sum, row) => sum + row.revenue, 0))}
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="size-2 rounded-full bg-brand-orange" />
          Revenue
        </span>
      </div>
      <div ref={container} className="relative w-full min-w-0">
        {!series.length ? (
          <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-center text-sm text-text-secondary">
            <ChartNoAxesCombined
              className="size-8 text-champagne"
              aria-hidden
            />
            No revenue recorded in this period.
          </div>
        ) : (
          <>
            <svg
              role="img"
              aria-label="Revenue by period"
              viewBox={`0 0 ${width} ${height}`}
              className="block h-[260px] w-full overflow-visible"
              onMouseLeave={() => setActive(null)}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const target =
                  ((event.clientX - rect.left) * width) / rect.width;
                setActive(
                  points.reduce(
                    (best, p, index) =>
                      Math.abs(p.x - target) < Math.abs(points[best].x - target)
                        ? index
                        : best,
                    0,
                  ),
                );
              }}
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8500" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#ff8500" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <g key={t}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y(ceiling * t)}
                    y2={y(ceiling * t)}
                    stroke="currentColor"
                    className="text-border"
                    strokeDasharray={t ? '3 5' : undefined}
                  />
                  <text
                    x={left - 10}
                    y={y(ceiling * t) + 4}
                    textAnchor="end"
                    className="fill-text-secondary"
                    fontSize="11"
                  >
                    {compact(ceiling * t)}
                  </text>
                </g>
              ))}
              <path
                d={`${path} L ${points.at(-1)!.x} ${height - bottom} L ${points[0].x} ${height - bottom} Z`}
                fill={`url(#${gradient})`}
              />
              <path
                d={path}
                fill="none"
                stroke="#f58a16"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {focused && (
                <line
                  x1={focused.x}
                  x2={focused.x}
                  y1={top}
                  y2={height - bottom}
                  stroke="#c5a46d"
                  strokeDasharray="4 4"
                />
              )}
              {points.map((point, index) => (
                <g key={point.date}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active === index ? 5 : 3.5}
                    fill="#f58a16"
                    stroke="var(--color-surface,white)"
                    strokeWidth="2"
                    tabIndex={0}
                    aria-label={`${reportDate(point.date)}: ${reportMoney(point.revenue)}`}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className="outline-none"
                  >
                    <title>
                      {reportDate(point.date)}: {reportMoney(point.revenue)}
                    </title>
                  </circle>
                  {(index === 0 ||
                    index === points.length - 1 ||
                    (index % labelEvery === 0 &&
                      point.x - points[0].x >= 65 &&
                      points.at(-1)!.x - point.x >= 65)) && (
                    <text
                      x={point.x}
                      y={height - 8}
                      textAnchor={
                        index === 0
                          ? 'start'
                          : index === points.length - 1
                            ? 'end'
                            : 'middle'
                      }
                      fontSize="11"
                      className="fill-text-secondary"
                    >
                      {new Date(`${point.date}T00:00:00Z`).toLocaleDateString(
                        'en-IN',
                        { day: 'numeric', month: 'short', timeZone: 'UTC' },
                      )}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            {focused && (
              <div
                className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
                style={{
                  left: Math.max(0, Math.min(width - 170, focused.x - 80)),
                }}
              >
                <p className="text-text-secondary">
                  {reportDate(focused.date)}
                </p>
                <p className="mt-1 font-semibold tabular-nums text-text">
                  {reportMoney(focused.revenue)}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AdminReportPanel>
  );
}
