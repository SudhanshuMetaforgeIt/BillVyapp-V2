'use client';

import { formatCurrency } from '@/lib/format';
import type { PlanPriceSlice } from '../types/plans.types';

type PlansPriceDonutProps = {
  averagePrice: number;
  slices: PlanPriceSlice[];
};

const RADIUS = 54;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function PlansPriceDonut({
  averagePrice,
  slices,
}: PlansPriceDonutProps) {
  const chartSlices = slices.filter((s) => s.percent > 0);
  let offset = 0;
  const segments = chartSlices.map((slice) => {
    const length = (slice.percent / 100) * CIRCUMFERENCE;
    const segment = { ...slice, dash: length, offset };
    offset += length;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img">
          <title>Plan price overview</title>
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {segments.map((segment) => (
            <circle
              key={segment.id}
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
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            Avg. Price
          </p>
          <p className="text-lg font-bold tracking-tight text-text">
            {formatCurrency(averagePrice)}
          </p>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {slices.map((slice) => (
          <li
            key={slice.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="inline-flex items-center gap-2 text-text">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              {slice.label}
            </span>
            <span className="tabular-nums text-text-secondary">
              <span className="font-semibold text-text">{slice.priceLabel}</span>
              {slice.percent > 0 ? ` (${slice.percent.toFixed(1)}%)` : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
