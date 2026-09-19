'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateCampaign } from '../hooks/use-admin-campaigns';
import type { CampaignType } from '../types/admin-campaigns.types';

type CreateCampaignDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
};

export function CreateCampaignDialog({
  isOpen,
  onClose,
  branches,
}: CreateCampaignDialogProps) {
  const createCampaignMutation = useCreateCampaign();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CampaignType>('DISCOUNT');
  const [salonId, setSalonId] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createCampaignMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || 'Special promotion offer',
        type,
        salonId: salonId || undefined,
        startDate,
        endDate,
      });

      onClose();
      // Reset form
      setName('');
      setDescription('');
      setType('DISCOUNT');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create campaign.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-white">
              Create New Campaign
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Launch promotions and special deals to engage salon clients.
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

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Campaign Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Hair Care Offer"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>

          {/* Offer Details */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Offer Description / Tagline
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 20% OFF on Hair Spa"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>

          {/* Campaign Type & Branch */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Campaign Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CampaignType)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              >
                <option value="DISCOUNT">Discount Offer</option>
                <option value="REFERRAL">Referral Bonus</option>
                <option value="OCCASION">Occasion / Festival</option>
                <option value="PROMOTION">Promotional Launch</option>
                <option value="LOYALTY">Loyalty Exclusive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Target Branch
              </label>
              <select
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Period Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-800 dark:text-stone-200"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
