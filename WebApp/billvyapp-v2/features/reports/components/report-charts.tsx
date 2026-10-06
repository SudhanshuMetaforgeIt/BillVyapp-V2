'use client';
import { useEffect, useRef, useState } from 'react';
import { SectionEmptyState } from '@/components/layout/section-states';
import { formatCurrency } from '@/lib/format';
import type { AnalyticsRow } from '../types/reports.types';
import { AnalyticsTable } from './report-analytics-widgets';

export function RevenueTrend({ data }: { data: AnalyticsRow[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(180, entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...data.map((r) => Number(r.revenue)));
  return (
    <div ref={chartRef} className="app-surface-card p-5">
      <h3 className="font-semibold">Revenue trend</h3>
      {data.length === 0 ? (
        <SectionEmptyState
          title="No revenue data"
          message="No successful payments for the selected period."
        />
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} 240`}
            role="img"
            aria-label="Successful payment revenue by period"
            className="mt-4 w-full"
          >
            <title>
              Revenue trend; each bar includes its revenue, transactions and
              average transaction value.
            </title>
            {[0, 0.5, 1].map((r) => (
              <g key={r}>
                <line
                  x1="72"
                  x2={width - 8}
                  y1={210 - r * 180}
                  y2={210 - r * 180}
                  stroke="var(--bv-border)"
                />
                <text
                  x="66"
                  y={214 - r * 180}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--bv-text-secondary)"
                >
                  {formatCurrency(max * r)}
                </text>
              </g>
            ))}
            {data.map((r, i) => {
              const step = (width - 84) / data.length,
                h = (Number(r.revenue) / max) * 180;
              return (
                <g key={String(r.period)}>
                  <rect
                    tabIndex={0}
                    x={76 + i * step}
                    y={210 - h}
                    width={Math.max(1, step * 0.7)}
                    height={Math.max(h, 1)}
                    rx="3"
                    fill="var(--bv-champagne)"
                  >
                    <title>{`${r.period}: ${formatCurrency(Number(r.revenue))}; ${r.transactions} successful payments; average ${formatCurrency(Number(r.averageTransaction))}`}</title>
                  </rect>
                  {(data.length <= Math.max(1, Math.floor((width - 84) / 90)) ||
                    i %
                      Math.ceil(
                        data.length /
                          Math.max(1, Math.floor((width - 84) / 90)),
                      ) ===
                      0) && (
                    <text
                      x={76 + (i + 0.35) * step}
                      y="232"
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--bv-text-secondary)"
                    >
                      {String(r.period).slice(0, 10)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-text-secondary">
              View accessible chart data
            </summary>
            <AnalyticsTable
              title="Revenue periods"
              data={data}
              columns={[
                { key: 'period', label: 'Period' },
                { key: 'revenue', label: 'Revenue', money: true },
                { key: 'transactions', label: 'Successful payments' },
                {
                  key: 'averageTransaction',
                  label: 'Average transaction',
                  money: true,
                },
              ]}
            />
          </details>
        </>
      )}
    </div>
  );
}
export function RevenueBars({
  title,
  data,
  label,
  limit = 5,
}: {
  title: string;
  data: AnalyticsRow[];
  label: string;
  limit?: number;
}) {
  const max = Math.max(1, ...data.map((r) => Number(r.revenue)));
  return (
    <div className="app-surface-card p-5">
      <h3 className="font-semibold">{title}</h3>
      {data.length === 0 ? (
        <SectionEmptyState
          title="No data"
          message="No revenue records for the selected period."
        />
      ) : (
        <ul className="mt-4 space-y-4">
          {data.slice(0, limit).map((r, i) => (
            <li key={String(r.id ?? i)}>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {r[label]}
                </span>
                <span>{formatCurrency(Number(r.revenue))}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-champagne-light">
                <div
                  className="h-2 rounded-full bg-champagne"
                  style={{ width: `${(Number(r.revenue) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
