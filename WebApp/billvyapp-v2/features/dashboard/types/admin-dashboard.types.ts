import type { LucideIcon } from 'lucide-react';

// ─── Stat Card ────────────────────────────────────────────────────────────────

export type StatTone = 'orange' | 'emerald' | 'champagne' | 'danger' | 'info' | 'neutral';

export type AdminStat = {
  id: string;
  label: string;
  /** Raw number for formatting */
  rawValue: number;
  /** Pre-formatted display string (e.g. "₹2,45,680") */
  displayValue: string;
  changePercent: number | null;
  /** e.g. "vs last month", "this month" */
  comparisonLabel: string;
  icon: LucideIcon;
  iconTone: StatTone;
};

// ─── Revenue Chart ────────────────────────────────────────────────────────────

export type AdminRevenuePoint = {
  dayKey: string;
  /** Short label for the x-axis: "May 5", "May 6" */
  label: string;
  amount: number;
};

// ─── Branch Performance ───────────────────────────────────────────────────────

export type AdminBranchPerf = {
  id: string;
  name: string;
  revenue: number;
  /** 0–100 percentage of the top branch */
  percent: number;
};

// ─── Business Summary ─────────────────────────────────────────────────────────

export type AdminSummaryItem = {
  id: string;
  label: string;
  value: string;
  tone: StatTone;
  icon: LucideIcon;
};

// ─── Recent Bills ─────────────────────────────────────────────────────────────

export type AdminBillStatus = 'paid' | 'pending' | 'failed';

export type AdminRecentBill = {
  id: string;
  billNo: string;
  customer: string;
  amount: number;
  status: AdminBillStatus;
};

// ─── Recent Customers ─────────────────────────────────────────────────────────

export type AdminRecentCustomer = {
  id: string;
  name: string;
  initials: string;
  branch: string;
  dateLabel: string;
};

// ─── Quick Actions ────────────────────────────────────────────────────────────

export type AdminQuickAction = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, renders the action with the brand-orange filled button style */
  primary?: boolean;
};

// ─── At a Glance ──────────────────────────────────────────────────────────────

export type AdminGlanceMetric = {
  id: string;
  label: string;
  displayValue: string;
  icon: LucideIcon;
  iconTone: StatTone;
};
