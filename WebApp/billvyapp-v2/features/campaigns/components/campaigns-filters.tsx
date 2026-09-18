'use client';

import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CampaignsFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  apiUnavailable?: boolean;
};

export function CampaignsFilters({
  search,
  onSearchChange,
  apiUnavailable,
}: CampaignsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search campaigns..."
          className="h-10 pr-9"
          aria-label="Search campaigns"
          disabled={apiUnavailable}
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>

      <Button
        type="button"
        className="h-10 bg-champagne text-white hover:bg-champagne/90"
        onClick={() =>
          toast(
            'Campaigns API is not available yet. This screen will light up when the backend ships.',
          )
        }
      >
        <Plus className="size-4" />
        Create Campaign
      </Button>
    </div>
  );
}
