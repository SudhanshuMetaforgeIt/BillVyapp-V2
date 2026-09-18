'use client';

import {
  Calendar,
  Gift,
  MapPin,
  Megaphone,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CampaignItem } from '../types/admin-campaigns.types';

type CampaignDetailsDialogProps = {
  campaign: CampaignItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function CampaignDetailsDialog({
  campaign,
  isOpen,
  onClose,
}: CampaignDetailsDialogProps) {
  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {campaign.name}
              </h2>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {campaign.type}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {campaign.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details list */}
        <div className="mt-4 space-y-3 rounded-xl border border-stone-100 bg-stone-50/50 p-4 text-xs dark:border-stone-800 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Calendar className="h-4 w-4 text-stone-400" />
            <span>Valid Period: <strong className="font-semibold">{campaign.period}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <MapPin className="h-4 w-4 text-stone-400" />
            <span>Target Location: <strong className="font-semibold">{campaign.branchName}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Users className="h-4 w-4 text-stone-400" />
            <span>Target Audience Reach: <strong className="font-semibold">{campaign.audience ? `${campaign.audience.toLocaleString('en-IN')} Clients` : 'All registered clients'}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Tag className="h-4 w-4 text-stone-400" />
            <span>Campaign Status: <strong className="capitalize font-semibold">{campaign.status.toLowerCase()}</strong></span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end border-t border-stone-100 pt-3 dark:border-stone-800">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 px-5 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
