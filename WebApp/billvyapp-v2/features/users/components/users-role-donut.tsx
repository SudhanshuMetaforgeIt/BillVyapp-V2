'use client';

import { formatNumber } from '@/lib/format';
import type { UserRoleSlice } from '../types/users.types';

type UsersRoleDonutProps = {
  total: number;
  slices: UserRoleSlice[];
};

const RADIUS = 54;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function UsersRoleDonut({ total, slices }: UsersRoleDonutProps) {
  let offset = 0;
  const segments = slices
    .filter((s) => s.count > 0)
    .map((slice) => {
      const length = (slice.percent / 100) * CIRCUMFERENCE;
      const segment = { ...slice, dash: length, offset };
      offset += length;
      return segment;
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img">
          <title>User role distribution</title>
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
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xl font-bold tracking-tight text-text">
            {formatNumber(total)}
          </p>
          <p className="text-xs font-medium text-text-secondary">Total</p>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {slices.map((slice) => (
          <li
            key={slice.key}
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
