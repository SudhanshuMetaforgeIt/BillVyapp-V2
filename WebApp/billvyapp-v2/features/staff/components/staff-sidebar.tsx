'use client';

import {
  CalendarCheck,
  ChevronRight,
  Plus,
  Scissors,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  StaffRoleDistributionItem,
  StaffStats,
} from '../types/staff.types';

type StaffSidebarProps = {
  stats: StaffStats;
  roleDistribution: StaffRoleDistributionItem[];
  onAddStaff: () => void;
  onBulkActions?: () => void;
  onAttendance?: () => void;
};

export function StaffSidebar({
  stats,
  roleDistribution,
  onAddStaff,
  onBulkActions,
  onAttendance,
}: StaffSidebarProps) {
  const total = stats.totalStaff;
  const active = stats.activeStaff;
  const onLeave = stats.onLeave;
  const inactive = stats.inactiveStaff;
  const other = Math.max(0, total - (active + onLeave + inactive));

  // Donut chart calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const getArcs = () => {
    if (total === 0) {
      return [{ color: '#e7e5e4', strokeDasharray: `${circumference} 0`, offset: 0 }];
    }

    const segments = [
      { count: active, color: '#22c55e' }, // Green
      { count: onLeave, color: '#f59e0b' }, // Amber
      { count: inactive, color: '#ef4444' }, // Red
      { count: other, color: '#a8a29e' }, // Gray
    ];

    let currentOffset = 0;
    return segments
      .filter((s) => s.count > 0)
      .map((seg) => {
        const strokeLength = (seg.count / total) * circumference;
        const arc = {
          color: seg.color,
          strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
          offset: -currentOffset,
        };
        currentOffset += strokeLength;
        return arc;
      });
  };

  const arcs = getArcs();

  const quickActions = [
    {
      id: 'add-staff',
      label: 'Add New Staff',
      icon: Plus,
      onClick: onAddStaff,
    },
    {
      id: 'bulk-actions',
      label: 'Bulk Actions',
      icon: Users,
      onClick: onBulkActions,
    },
    {
      id: 'attendance',
      label: 'Staff Attendance',
      icon: CalendarCheck,
      onClick: onAttendance,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Staff Summary Card with Donut */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Staff Summary
        </h3>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Donut Chart */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="fill-transparent stroke-stone-100 dark:stroke-stone-800"
                strokeWidth="10"
              />
              {arcs.map((arc, i) => (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={arc.color}
                  strokeWidth="10"
                  strokeDasharray={arc.strokeDasharray}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-base font-bold tracking-tight text-stone-900 dark:text-white">
                {total.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-stone-400">Total Staff</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 text-xs flex-1 min-w-[140px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Active</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {active.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">({stats.activeStaffPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">On Leave</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {onLeave.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">({stats.onLeavePct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Inactive</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {inactive.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">({stats.inactiveStaffPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Other</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {other.toLocaleString('en-IN')}{' '}
                <span className="font-normal text-stone-400">
                  ({total > 0 ? Number(((other / total) * 100).toFixed(1)) : 0}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Role Distribution Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Role Distribution
        </h3>

        <div className="mt-3 space-y-2.5 text-xs">
          {roleDistribution.length === 0 ? (
            <div className="text-stone-400 text-xs py-2">
              No staff role assignments yet.
            </div>
          ) : (
            roleDistribution.map((item) => (
              <div
                key={item.roleName}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                  <span className="text-amber-500">▲</span>
                  <span>{item.roleName}</span>
                </div>
                <span className="font-bold text-stone-900 dark:text-white">
                  {item.count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Quick Actions Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Quick Actions
        </h3>

        <div className="mt-3 space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="flex w-full items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2.5 text-left text-xs font-semibold text-stone-800 transition hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-800 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-200 dark:hover:border-amber-800 dark:hover:bg-amber-950/20"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>{action.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
