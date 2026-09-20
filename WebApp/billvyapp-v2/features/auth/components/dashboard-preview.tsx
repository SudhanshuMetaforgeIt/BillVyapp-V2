import type { ReactNode } from 'react';
import {
  BarChart3,
  Building2,
  IndianRupee,
  RefreshCw,
  Shield,
  Sun,
} from 'lucide-react';

/**
 * Stylized product preview for the login branding panel.
 * Pure CSS/SVG illustration — no external dashboard asset required.
 */
export function DashboardPreview() {
  return (
    <div className="auth-preview-root relative mx-auto">
      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-3 shadow-2xl shadow-black/40 @min-[22.5rem]:p-4 @min-[28rem]:p-5">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/50">Overview</p>
            <p className="truncate text-sm font-semibold text-white">
              Business Dashboard
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF7B00] text-white">
            <BarChart3 className="h-4 w-4" aria-hidden />
          </div>
        </div>

        <div className="auth-preview-metrics grid grid-cols-3 gap-2 @min-[22.5rem]:gap-3">
          <MetricCard
            label="Total Revenue"
            value="₹48,25,680"
            icon={<IndianRupee className="h-3.5 w-3.5" aria-hidden />}
          />
          <MetricCard
            label="Total Transactions"
            value="5,842"
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          />
          <MetricCard
            label="Businesses"
            value="245"
            icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
          />
        </div>

        <div className="auth-preview-charts mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <div className="min-w-0 rounded-xl border border-white/10 bg-black/40 p-3">
            <p className="mb-2 text-[11px] font-medium text-white/50">
              Revenue Trend
            </p>
            <RevenueChart />
          </div>
          <div className="auth-preview-donut flex w-20 max-w-full flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40 p-3 @min-[22.5rem]:w-24">
            <DonutChart />
            <p className="mt-2 text-center text-[10px] text-white/50">Mix</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/35 p-2.5 @min-[22.5rem]:p-3">
      <div className="mb-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF7B00]/15 text-[#FF7B00]">
        {icon}
      </div>
      <p className="text-[10px] leading-tight text-pretty text-white/45 @min-[22.5rem]:text-[11px]">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold tracking-tight break-words text-white @min-[22.5rem]:text-sm">
        {value}
      </p>
    </div>
  );
}

function RevenueChart() {
  return (
    <svg
      viewBox="0 0 220 72"
      className="h-16 w-full"
      role="img"
      aria-label="Upward revenue trend chart"
    >
      <defs>
        <linearGradient id="login-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF7B00" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF7B00" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 58 C28 54, 40 48, 55 42 C78 32, 95 38, 115 28 C138 16, 155 22, 175 14 C190 8, 205 12, 220 6 L220 72 L0 72 Z"
        fill="url(#login-chart-fill)"
      />
      <path
        d="M0 58 C28 54, 40 48, 55 42 C78 32, 95 38, 115 28 C138 16, 155 22, 175 14 C190 8, 205 12, 220 6"
        fill="none"
        stroke="#FF7B00"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DonutChart() {
  return (
    <svg viewBox="0 0 42 42" className="h-12 w-12" aria-hidden>
      <circle
        cx="21"
        cy="21"
        r="15"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="5"
      />
      <circle
        cx="21"
        cy="21"
        r="15"
        fill="none"
        stroke="#FF7B00"
        strokeWidth="5"
        strokeDasharray="60 35"
        strokeLinecap="round"
        transform="rotate(-90 21 21)"
      />
      <circle
        cx="21"
        cy="21"
        r="15"
        fill="none"
        stroke="#D4A017"
        strokeWidth="5"
        strokeDasharray="18 77"
        strokeDashoffset="-60"
        strokeLinecap="round"
        transform="rotate(-90 21 21)"
      />
    </svg>
  );
}

export function FeatureHighlights() {
  const features = [
    {
      title: 'Secure',
      description: 'Enterprise-grade security',
      icon: Shield,
    },
    {
      title: 'Fast',
      description: 'Optimized for performance',
      icon: RefreshCw,
    },
    {
      title: 'Reliable',
      description: 'Built for scale and reliability',
      icon: Sun,
    },
  ] as const;

  return (
    <div className="auth-feature-grid">
      <div className="auth-feature-grid-inner grid grid-cols-3 gap-3 @min-[24rem]:gap-6">
        {features.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            data-auth-animate="feature"
            className="min-w-0 text-center"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF7B00]/50 text-[#FF7B00] sm:h-11 sm:w-11">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-pretty text-white/45 sm:text-xs">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
