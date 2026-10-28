'use client';

import { formatNumber } from '@/lib/format';
import type { BusinessSummarySlice } from '../types/businesses.types';

type BusinessesStatusDonutProps = {
  total: number;
  slices: BusinessSummarySlice[];
};

const RADIUS = 54;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BusinessesStatusDonut({
  total,
  slices,
}: BusinessesStatusDonutProps) {
  let offset = 0;
  const segments: Array<BusinessSummarySlice & { dash: number; offset: number }> = [];
  for (const slice of slices) {
    if (slice.count <= 0) continue;
    const length = (slice.percent / 100) * CIRCUMFERENCE;
    segments.push({ ...slice, dash: length, offset });
    offset += length;
  }

  return (
    <div className="app-business-summary flex min-w-0 flex-wrap items-center justify-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img">
          <title>Business status distribution</title>
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {segments.length === 0 ? null : (
            segments.map((segment) => (
              <circle
                key={segment.key}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE}
                strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="butt"
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xl font-bold tracking-tight text-text">
            {formatNumber(total)}
          </p>
          <p className="text-xs font-medium text-text-secondary">Total</p>
        </div>
      </div>

      <ul className="app-business-summary-legend min-w-0 flex-[1_1_13rem] space-y-2.5">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-text">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              {slice.label}
            </span>
            <span className="app-business-summary-value shrink-0 whitespace-nowrap tabular-nums text-text-secondary">
              <span className="font-semibold text-text">
                {formatNumber(slice.count)}
              </span>{' '}
              ({slice.percent.toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
