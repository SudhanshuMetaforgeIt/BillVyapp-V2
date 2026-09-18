import type { LucideIcon } from 'lucide-react';

export type RevenuePoint = {
  monthKey: string;
  label: string;
  amount: number;
};

export type QuickActionConfig = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};
