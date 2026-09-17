import type { LucideIcon } from 'lucide-react';

/**
 * PLACEHOLDER: revenue time-series until a dedicated analytics endpoint exists.
 * Replace via dashboard.service once Nest exposes monthly aggregates.
 */
export type RevenuePoint = {
  monthKey: string;
  label: string;
  amount: number;
};

export const PLACEHOLDER_REVENUE_SERIES: RevenuePoint[] = [
  { monthKey: '2024-12', label: "Dec '24", amount: 420_000 },
  { monthKey: '2025-01', label: "Jan '25", amount: 510_000 },
  { monthKey: '2025-02', label: "Feb '25", amount: 480_000 },
  { monthKey: '2025-03', label: "Mar '25", amount: 620_000 },
  { monthKey: '2025-04', label: "Apr '25", amount: 710_000 },
  { monthKey: '2025-05', label: "May '25", amount: 845_680 },
];

export type QuickActionConfig = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};
