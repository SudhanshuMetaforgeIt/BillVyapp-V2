'use client';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import type { PaymentMethodSlice } from '../services/dashboard.service';

type ManagerPaymentMethodsProps = {
  slices: PaymentMethodSlice[];
  total: number;
  isLoading?: boolean;
};

const SLICE_COLORS = [
  'var(--bv-champagne)',
  'var(--bv-brand-orange, #ff7b00)',
  'var(--bv-emerald, #2f9e7a)',
  'var(--bv-text-secondary)',
  '#7a8aa0',
  '#c4a574',
];

function donutPaths(slices: PaymentMethodSlice[], radius: number, cx: number, cy: number) {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  if (total <= 0) return [];

  let angle = -Math.PI / 2;
  return slices.map((slice, index) => {
    const sweep = (slice.amount / total) * Math.PI * 2;
    const x1 = cx + radius * Math.cos(angle);
    const y1 = cy + radius * Math.sin(angle);
    angle += sweep;
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    return {
      id: slice.method,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
      label: slice.label,
      percent: slice.percent,
    };
  });
}

export function ManagerPaymentMethods({
  slices,
  total,
  isLoading,
}: ManagerPaymentMethodsProps) {
  const paths = donutPaths(slices, 72, 100, 100);

  return (
    <DashboardSectionCard
      title="Sales by Payment Method"
      data-dash-animate="section"
      className="h-full"
      bodyClassName="pt-4"
    >
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : slices.length === 0 || total <= 0 ? (
        <SectionEmptyState message="No payment method data for this period." />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <svg
              viewBox="0 0 200 200"
              className="size-44"
              role="img"
              aria-label="Payment method distribution"
            >
              <title>Payment methods</title>
              {paths.map((path) => (
                <path key={path.id} d={path.d} fill={path.color} opacity={0.92} />
              ))}
              <circle cx={100} cy={100} r={44} fill="var(--bv-surface, #fff)" />
              <text
                x={100}
                y={96}
                textAnchor="middle"
                fontSize={11}
                className="fill-[var(--bv-text-secondary)]"
              >
                Total
              </text>
              <text
                x={100}
                y={114}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                className="fill-[var(--bv-text)]"
              >
                {formatCompactCurrency(total)}
              </text>
            </svg>
          </div>

          <ul className="w-full space-y-2.5">
            {slices.map((slice, index) => (
              <li
                key={slice.method}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length],
                    }}
                    aria-hidden
                  />
                  <span className="truncate font-medium text-text">
                    {slice.label}
                  </span>
                </span>
                <span className="shrink-0 text-text-secondary">
                  {slice.percent}% · {formatCurrency(slice.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardSectionCard>
  );
}
