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
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-2xl shadow-black/40 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white/50">Overview</p>
            <p className="text-sm font-semibold text-white">Business Dashboard</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7B00] text-white">
            <BarChart3 className="h-4 w-4" aria-hidden />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
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

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <div className="rounded-xl border border-white/10 bg-black/40 p-3">
            <p className="mb-2 text-[11px] font-medium text-white/50">
              Revenue Trend
            </p>
            <RevenueChart />
          </div>
          <div className="flex w-20 flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40 p-3 sm:w-24">
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
    <div className="rounded-xl border border-white/10 bg-black/35 p-2.5 sm:p-3">
      <div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF7B00]/15 text-[#FF7B00]">
        {icon}
      </div>
      <p className="text-[10px] leading-tight text-white/45 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold tracking-tight text-white sm:text-sm">
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
    <div className="grid grid-cols-3 gap-3 sm:gap-6">
      {features.map(({ title, description, icon: Icon }) => (
        <div
          key={title}
          data-auth-animate="feature"
          className="text-center"
        >
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF7B00]/50 text-[#FF7B00] sm:h-11 sm:w-11">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45 sm:text-xs">
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}
