'use client';

import toast from 'react-hot-toast';
import { HelpCircle, Megaphone, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CampaignsSidePanelProps = {
  summary: Array<{ status: string; count: number; tone: string }>;
};

function toneClass(tone: string): string {
  if (tone === 'success') return 'bg-emerald';
  if (tone === 'warning') return 'bg-warning';
  if (tone === 'muted') return 'bg-muted-foreground/40';
  return 'bg-charcoal-soft';
}

export function CampaignsSidePanel({ summary }: CampaignsSidePanelProps) {
  const total = summary.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-4" data-dash-animate="section">
      <div className="app-surface-card p-5">
        <h3 className="mb-4 text-base font-semibold text-text">
          Campaign Summary
        </h3>

        <div className="mb-4 flex items-center justify-center">
          <div className="relative flex size-36 items-center justify-center rounded-full border-[10px] border-muted">
            <div className="text-center">
              <p className="text-2xl font-bold text-text">{total}</p>
              <p className="text-xs text-text-secondary">Total</p>
            </div>
          </div>
        </div>

        <ul className="space-y-2.5">
          {summary.map((row) => (
            <li
              key={row.status}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2 text-text-secondary">
                <span
                  className={cn('size-2.5 rounded-full', toneClass(row.tone))}
                />
                {row.status}
              </span>
              <span className="font-semibold text-text">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="app-surface-card space-y-3 p-5">
        <h3 className="text-base font-semibold text-text">Quick Actions</h3>
        <Button
          type="button"
          className="h-11 w-full justify-start bg-champagne text-white hover:bg-champagne/90"
          onClick={() =>
            toast(
              'Campaigns API is not available yet. This screen will light up when the backend ships.',
            )
          }
        >
          <Plus className="size-4" />
          Create New Campaign
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start"
          onClick={() => toast('Campaign reports are not available yet.')}
        >
          <Megaphone className="size-4" />
          View Campaign Reports
        </Button>
      </div>

      <div className="app-surface-card p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-charcoal-soft">
            <HelpCircle className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text">Need Help?</h3>
            <p className="mt-1 text-xs text-text-secondary">
              Campaign management will connect once the backend endpoints are
              added.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
