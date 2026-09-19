'use client';

import {
  BarChart3,
  ChevronRight,
  Headphones,
  Plus,
} from 'lucide-react';
import type { CampaignStats } from '../types/admin-campaigns.types';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

type CampaignsSidebarProps = {
  stats: CampaignStats;
  onCreateCampaign: () => void;
  onViewReports?: () => void;
};

export function CampaignsSidebar({
  stats,
  onCreateCampaign,
  onViewReports,
}: CampaignsSidebarProps) {
  const router = useRouter();

  const total = stats.totalCampaigns;
  const active = stats.activeCampaigns;
  const upcoming = stats.upcomingCampaigns;
  const completed = stats.completedCampaigns;
  const draft = stats.draftCampaigns;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const getArcs = () => {
    if (total === 0) {
      return [{ color: '#e7e5e4', strokeDasharray: `${circumference} 0`, offset: 0 }];
    }

    const segments = [
      { count: active, color: '#22c55e' }, // Emerald/Green
      { count: upcoming, color: '#f59e0b' }, // Amber
      { count: completed, color: '#ef4444' }, // Red
      { count: draft, color: '#a8a29e' }, // Gray
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
      id: 'create-campaign',
      label: 'Create New Campaign',
      icon: Plus,
      onClick: onCreateCampaign,
    },
    {
      id: 'view-reports',
      label: 'View Campaign Reports',
      icon: BarChart3,
      onClick: onViewReports || (() => router.push(ROUTES.dashboard.admin.reports)),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Campaign Summary Card with Donut */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Campaign Summary
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
                {total}
              </span>
              <span className="text-[10px] text-stone-400">Total</span>
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
                {active}{' '}
                <span className="font-normal text-stone-400">({stats.activeCampaignsPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Upcoming</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {upcoming}{' '}
                <span className="font-normal text-stone-400">({stats.upcomingCampaignsPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Completed</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {completed}{' '}
                <span className="font-normal text-stone-400">({stats.completedCampaignsPct}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600" />
                <span className="text-stone-600 dark:text-stone-400 font-medium">Draft</span>
              </div>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {draft}{' '}
                <span className="font-normal text-stone-400">
                  ({total > 0 ? Number(((draft / total) * 100).toFixed(1)) : 0}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Card */}
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

      {/* 3. Need Help Card */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Need Help?
        </h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Our support team is always ready to help you.
        </p>

        <button
          type="button"
          onClick={() => router.push(ROUTES.dashboard.admin.support)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <Headphones className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Contact Support</span>
        </button>
      </div>
    </div>
  );
}
