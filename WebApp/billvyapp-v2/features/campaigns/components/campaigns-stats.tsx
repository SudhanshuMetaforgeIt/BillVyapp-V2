'use client';

import { CheckCircle2, Clock, Megaphone, XCircle } from 'lucide-react';
import type { CampaignStats } from '../types/campaigns.types';

type CampaignsStatsProps = {
  stats: CampaignStats;
  loading?: boolean;
};

export function CampaignsStats({ stats, loading }: CampaignsStatsProps) {
  const cards = [
    {
      id: 'total-campaigns',
      label: 'Total Campaigns',
      value: stats.totalCampaigns.toLocaleString('en-IN'),
      subtitle: stats.totalCampaignsSubtitle,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Megaphone,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'active-campaigns',
      label: 'Active Campaigns',
      value: stats.activeCampaigns.toLocaleString('en-IN'),
      subtitle: `${stats.activeCampaignsPct}% of total`,
      subtitleColor: 'text-emerald-600 dark:text-emerald-400',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      id: 'upcoming-campaigns',
      label: 'Upcoming Campaigns',
      value: stats.upcomingCampaigns.toLocaleString('en-IN'),
      subtitle: `${stats.upcomingCampaignsPct}% of total`,
      subtitleColor: 'text-amber-600 dark:text-amber-400',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'completed-campaigns',
      label: 'Completed Campaigns',
      value: stats.completedCampaigns.toLocaleString('en-IN'),
      subtitle: `${stats.completedCampaignsPct}% of total`,
      subtitleColor: 'text-rose-600 dark:text-rose-400',
      icon: XCircle,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="flex items-start gap-4 rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs transition hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                {card.label}
              </span>
              <div className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-white truncate">
                {loading ? (
                  <div className="h-7 w-16 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                ) : (
                  card.value
                )}
              </div>
              <div className="mt-1.5">
                <span className={`text-[11px] font-medium ${card.subtitleColor}`}>
                  {card.subtitle}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
