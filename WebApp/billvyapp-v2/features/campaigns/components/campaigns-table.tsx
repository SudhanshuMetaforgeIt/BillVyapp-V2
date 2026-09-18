'use client';

import {
  Award,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Gift,
  MoreVertical,
  Percent,
  Plus,
  Scissors,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import type {
  CampaignItem,
  CampaignStatus,
  CampaignType,
} from '../types/campaigns.types';

type CampaignsTableProps = {
  campaigns: CampaignItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onCreateCampaign: () => void;
  onViewCampaign: (campaign: CampaignItem) => void;
  onEditCampaign: (campaign: CampaignItem) => void;
};

export function CampaignsTable({
  campaigns,
  total,
  currentPage,
  totalPages,
  limit,
  loading,
  onPageChange,
  onCreateCampaign,
  onViewCampaign,
  onEditCampaign,
}: CampaignsTableProps) {
  const getTypeBadge = (type: CampaignType) => {
    switch (type) {
      case 'DISCOUNT':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Discount
          </span>
        );
      case 'REFERRAL':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            Referral
          </span>
        );
      case 'OCCASION':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Occasion
          </span>
        );
      case 'PROMOTION':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Promotion
          </span>
        );
      case 'LOYALTY':
        return (
          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            Loyalty
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Active
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Upcoming
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            Completed
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-stone-50 px-2 py-0.5 text-xs font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            Draft
          </span>
        );
    }
  };

  const getIconForType = (type: CampaignType) => {
    switch (type) {
      case 'DISCOUNT':
        return <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'REFERRAL':
        return <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'OCCASION':
        return <Gift className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'PROMOTION':
        return <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'LOYALTY':
        return <Award className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <Scissors className="h-4 w-4 text-stone-600 dark:text-stone-400" />;
    }
  };

  const startRecord = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, total);

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900">
      {campaigns.length === 0 && !loading ? (
        <div className="py-16 text-center">
          <SectionEmptyState
            title="No campaigns found"
            message="No campaigns have been created yet or none match your search criteria."
          />
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              onClick={onCreateCampaign}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold h-9 px-4 rounded-lg shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Campaign</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold text-stone-600 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-400">
                  <th className="px-4 py-3.5">Campaign Name</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Branch</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-4 py-3.5 text-center">Audience</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {campaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    className="transition-colors hover:bg-stone-50/70 dark:hover:bg-stone-800/40"
                  >
                    {/* Campaign Name */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800">
                          {getIconForType(camp.type)}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onViewCampaign(camp)}
                            className="font-semibold text-stone-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400 text-left"
                          >
                            {camp.name}
                          </button>
                          <div className="text-[11px] text-stone-400">
                            {camp.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getTypeBadge(camp.type)}
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 whitespace-nowrap">
                      {camp.branchName}
                    </td>

                    {/* Period */}
                    <td className="px-4 py-3.5 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                      {camp.period}
                    </td>

                    {/* Audience */}
                    <td className="px-4 py-3.5 text-center font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap">
                      {camp.audience ? camp.audience.toLocaleString('en-IN') : '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(camp.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewCampaign(camp)}
                          title="View Campaign"
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditCampaign(camp)}
                          title="Edit Campaign"
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewCampaign(camp)}
                          title="More options"
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-stone-200/80 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
            <div>
              Showing <span className="font-semibold text-stone-900 dark:text-white">{startRecord}</span> to{' '}
              <span className="font-semibold text-stone-900 dark:text-white">{endRecord}</span> of{' '}
              <span className="font-semibold text-stone-900 dark:text-white">{total}</span> campaigns
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => {
                const p = i + 1;
                const isCurrent = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-amber-500 text-white'
                        : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
