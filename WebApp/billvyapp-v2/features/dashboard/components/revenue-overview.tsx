'use client';

import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  DashboardSectionCard,
  SectionEmptyState,
} from '@/components/layout/section-states';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { RevenuePoint } from '../data/placeholders';
import { useRevenueSeries } from '../hooks/use-revenue-series';
import {
  inferRevenueBucket,
  revenueTabRange,
  type RevenueBucket,
  type RevenuePeriodTab,
} from '../services/dashboard.service';

type RevenueOverviewProps = {
  series?: RevenuePoint[];
  isLoading?: boolean;
  dynamic?: boolean;
};

const TABS: Array<{ id: RevenuePeriodTab; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Date Range' },
];

type ChartCoord = RevenuePoint & { x: number; y: number; index: number };

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Axis labels in the reference style (8k / 1.2L). */
function formatAxisAmount(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 100_000) {
    const lakhs = value / 100_000;
    return `${lakhs.toLocaleString('en-IN', {
      maximumFractionDigits: lakhs >= 10 ? 0 : 1,
    })}L`;
  }
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    return `${thousands.toLocaleString('en-IN', {
      maximumFractionDigits: thousands >= 10 ? 0 : 1,
    })}k`;
  }
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function buildSmoothPath(coords: ChartCoord[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  return coords
    .map((c, i) => {
      if (i === 0) return `M ${c.x} ${c.y}`;
      const prev = coords[i - 1];
      const dx = (c.x - prev.x) * 0.35;
      return `C ${prev.x + dx} ${prev.y} ${c.x - dx} ${c.y} ${c.x} ${c.y}`;
    })
    .join(' ');
}

function MiniSparkline({ points }: { points: RevenuePoint[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.amount), 1);
  const w = 56;
  const h = 22;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p.amount / max) * (h - 2) - 1;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 text-champagne"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PeriodTabs({
  value,
  onChange,
  showCustom,
}: {
  value: RevenuePeriodTab;
  onChange: (tab: RevenuePeriodTab) => void;
  showCustom: boolean;
}) {
  const tabs = showCustom ? TABS : TABS.filter((t) => t.id !== 'custom');

  return (
    <div
      className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-ivory p-0.5 ring-1 ring-border/70"
      role="tablist"
      aria-label="Revenue period"
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-secondary hover:text-text',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    const rawMax = Math.max(...points.map((p) => p.amount), 0);
    const max = niceCeiling(rawMax * 1.08);
    const left = 48;
    const right = 620;
    const top = 18;
    const bottom = 188;
    const plotWidth = right - left;
    const plotHeight = bottom - top;

    const coords: ChartCoord[] = points.map((point, index) => {
      const x = left + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y = top + (1 - point.amount / max) * plotHeight;
      return { ...point, x, y, index };
    });

    const linePath = buildSmoothPath(coords);
    const first = coords[0];
    const last = coords[coords.length - 1];
    const areaPath =
      first && last
        ? `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`
        : '';

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      t,
      y: top + (1 - t) * plotHeight,
      value: max * t,
    }));

    // Keep ~48px between label centers so "Sep 29" / "Sep 30" never collide.
    const minLabelGap = 48;
    const labeledKeys = new Set<string>();
    if (coords.length > 0) {
      labeledKeys.add(coords[0].monthKey);
      let lastLabeledX = coords[0].x;

      for (let i = 1; i < coords.length - 1; i += 1) {
        if (coords[i].x - lastLabeledX >= minLabelGap) {
          labeledKeys.add(coords[i].monthKey);
          lastLabeledX = coords[i].x;
        }
      }

      const end = coords[coords.length - 1];
      if (end.x - lastLabeledX >= minLabelGap) {
        labeledKeys.add(end.monthKey);
      } else if (coords.length > 1) {
        const prevLabeled = [...labeledKeys].at(-1);
        if (prevLabeled && prevLabeled !== coords[0].monthKey) {
          labeledKeys.delete(prevLabeled);
        }
        labeledKeys.add(end.monthKey);
      }
    }

    return {
      left,
      right,
      top,
      bottom,
      coords,
      linePath,
      areaPath,
      ticks,
      labeledKeys,
    };
  }, [points]);

  const nearestPoint = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || chart.coords.length === 0) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0) return null;
      const viewX = ((clientX - rect.left) / rect.width) * 640;
      let best = chart.coords[0];
      let bestDist = Math.abs(best.x - viewX);
      for (let i = 1; i < chart.coords.length; i += 1) {
        const dist = Math.abs(chart.coords[i].x - viewX);
        if (dist < bestDist) {
          best = chart.coords[i];
          bestDist = dist;
        }
      }
      return best;
    },
    [chart.coords],
  );

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = nearestPoint(event.clientX);
    setActiveKey(point?.monthKey ?? null);
  };

  const clearActive = () => setActiveKey(null);

  const activeIndex = chart.coords.findIndex((c) => c.monthKey === activeKey);
  const active = activeIndex >= 0 ? chart.coords[activeIndex] : null;
  const previous =
    activeIndex > 0 ? chart.coords[activeIndex - 1] : null;
  const isUp = active && previous ? active.amount >= previous.amount : true;

  return (
    <div className="relative w-full overflow-hidden" onMouseLeave={clearActive}>
      <svg
        ref={svgRef}
        viewBox="0 0 640 230"
        role="img"
        aria-label="Revenue over selected period"
        className="h-64 w-full cursor-crosshair select-none"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onPointerMove}
        onPointerLeave={clearActive}
        onPointerDown={(event) => {
          // Hover-only chart — block focus/selection artifacts that looked like bars.
          event.preventDefault();
          const point = nearestPoint(event.clientX);
          setActiveKey(point?.monthKey ?? null);
        }}
      >
        <title>Revenue overview</title>
        <defs>
          <linearGradient id="saRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--bv-champagne)"
              stopOpacity="0.35"
            />
            <stop
              offset="55%"
              stopColor="var(--bv-champagne)"
              stopOpacity="0.1"
            />
            <stop
              offset="100%"
              stopColor="var(--bv-champagne)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {chart.ticks.map((tick) => (
          <g key={tick.t}>
            <line
              x1={chart.left}
              x2={chart.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={chart.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              className="fill-[var(--bv-text-secondary)]"
              fontSize={10}
            >
              {formatAxisAmount(tick.value)}
            </text>
          </g>
        ))}

        {chart.areaPath ? (
          <path d={chart.areaPath} fill="url(#saRevenueFill)" />
        ) : null}

        {chart.linePath ? (
          <path
            d={chart.linePath}
            fill="none"
            stroke="var(--bv-champagne)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {active ? (
          <line
            x1={active.x}
            x2={active.x}
            y1={chart.top}
            y2={chart.bottom}
            stroke="var(--bv-charcoal)"
            strokeWidth={1.25}
            opacity={0.85}
            pointerEvents="none"
          />
        ) : null}

        {chart.coords.map((c) => {
          const isActive = activeKey === c.monthKey;
          const showLabel = chart.labeledKeys.has(c.monthKey);

          return (
            <g key={c.monthKey} pointerEvents="none">
              {isActive ? (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={4.5}
                  fill="var(--bv-champagne)"
                  stroke="#fff"
                  strokeWidth={2}
                />
              ) : null}
              {showLabel ? (
                <text
                  x={c.x}
                  y={216}
                  textAnchor={
                    c.index === 0
                      ? 'start'
                      : c.index === chart.coords.length - 1
                        ? 'end'
                        : 'middle'
                  }
                  fontSize={10}
                  className="fill-[var(--bv-text-secondary)]"
                >
                  {c.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute top-0 z-10 w-[min(11.5rem,100%)] -translate-x-1/2 overflow-hidden rounded-xl border border-border/60 bg-surface shadow-lg"
          style={{
            left: `clamp(min(6rem,50%), ${(active.x / 640) * 100}%, max(50%,calc(100% - 6rem)))`,
          }}
        >
          <div className="px-3 pt-2.5 pb-2">
            <p className="text-[11px] font-medium text-text-secondary">
              Revenue
            </p>
            <div className="mt-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-lg font-bold tabular-nums tracking-tight text-text">
                    {formatCurrency(active.amount)}
                  </p>
                  <span
                    className={cn(
                      'inline-flex size-4 items-center justify-center rounded',
                      isUp ? 'bg-emerald text-white' : 'bg-danger text-white',
                    )}
                  >
                    {isUp ? (
                      <ArrowUpRight className="size-3" aria-hidden />
                    ) : (
                      <ArrowDownRight className="size-3" aria-hidden />
                    )}
                  </span>
                </div>
                {previous ? (
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    vs {previous.label} {formatCurrency(previous.amount)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    First point in range
                  </p>
                )}
              </div>
              <MiniSparkline points={points} />
            </div>
          </div>
          <div className="border-t border-border/70 bg-ivory/80 px-3 py-1.5">
            <p className="text-[11px] text-text-secondary">{active.label}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function titleForTab(tab: RevenuePeriodTab): string {
  if (tab === 'day') return 'Daily Revenue';
  if (tab === 'week') return 'Weekly Revenue';
  if (tab === 'year') return 'Yearly Revenue';
  if (tab === 'custom') return 'Revenue Overview';
  return 'Monthly Revenue';
}

export function RevenueOverview({
  series,
  isLoading: externalLoading,
  dynamic = false,
}: RevenueOverviewProps) {
  const useDynamic = dynamic && !series;
  const initial = revenueTabRange('month');

  const [tab, setTab] = useState<RevenuePeriodTab>(
    useDynamic ? 'month' : 'month',
  );
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [bucket, setBucket] = useState<RevenueBucket>(initial.bucket);

  const query = useRevenueSeries(dateFrom, dateTo, bucket, useDynamic);

  const points = useMemo(() => {
    if (series) {
      if (tab === 'day') return series.slice(-7);
      if (tab === 'week') return series.slice(-4);
      return series;
    }
    return query.data ?? [];
  }, [series, tab, query.data]);

  const isLoading = useDynamic
    ? query.isLoading || query.isFetching
    : Boolean(externalLoading);

  const applyTab = (next: RevenuePeriodTab) => {
    setTab(next);
    if (next === 'custom') return;
    if (!useDynamic) return;
    const range = revenueTabRange(next);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setBucket(range.bucket);
  };

  const onCustomDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    if (from && to && from <= to) {
      setBucket(inferRevenueBucket(from, to));
    }
  };

  const rangeInvalid = useDynamic && dateFrom > dateTo;

  return (
    <DashboardSectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          {titleForTab(tab)}
          <Info
            className="size-3.5 text-text-secondary"
            aria-label="Revenue for the selected period"
          />
        </span>
      }
      data-dash-animate="section"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {useDynamic && tab === 'custom' ? (
            <>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onCustomDateChange(e.target.value, dateTo)}
                aria-label="Revenue from date"
                className="h-8 w-auto min-w-0 bg-background px-2 text-xs"
              />
              <span className="text-[10px] text-text-secondary">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onCustomDateChange(dateFrom, e.target.value)}
                aria-label="Revenue to date"
                className="h-8 w-auto min-w-0 bg-background px-2 text-xs"
              />
            </>
          ) : null}
          <PeriodTabs
            value={tab}
            onChange={applyTab}
            showCustom={useDynamic}
          />
        </div>
      }
      bodyClassName="pt-1 pb-3"
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rangeInvalid ? (
        <SectionEmptyState message="Choose a from date on or before the to date." />
      ) : query.isError && useDynamic ? (
        <SectionEmptyState message="Could not load revenue for this period." />
      ) : points.length === 0 ? (
        <SectionEmptyState message="No revenue data for this period." />
      ) : (
        <RevenueChart points={points} />
      )}
    </DashboardSectionCard>
  );
}
