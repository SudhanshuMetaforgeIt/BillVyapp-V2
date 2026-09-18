'use client';

import { useState } from 'react';
import { useAdminCampaigns } from '../../hooks/use-admin-campaigns';
import { CampaignsStats } from '../campaigns-stats';
import { AdminCampaignsFilters } from './admin-campaigns-filters';
import { AdminCampaignsTable } from './admin-campaigns-table';
import { CampaignsSidebar } from '../campaigns-sidebar';
import { CreateCampaignDialog } from '../create-campaign-dialog';
import { CampaignDetailsDialog } from '../campaign-details-dialog';
import type {
  CampaignItem,
  CampaignsFilterState,
} from '../../types/admin-campaigns.types';

export function AdminCampaignsPageView() {
  const [filters, setFilters] = useState<CampaignsFilterState>({
    search: '',
    statusTab: 'ALL',
    branchId: 'all',
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = useAdminCampaigns(filters);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<CampaignItem | null>(
    null,
  );

  const handleFiltersChange = (updated: Partial<CampaignsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const campaigns = data?.campaigns || [];
  const stats = data?.stats || {
    totalCampaigns: 0,
    totalCampaignsSubtitle: 'No data yet',
    activeCampaigns: 0,
    activeCampaignsPct: 0,
    upcomingCampaigns: 0,
    upcomingCampaignsPct: 0,
    completedCampaigns: 0,
    completedCampaignsPct: 0,
    draftCampaigns: 0,
  };
  const branches = data?.branches || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Campaigns
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Create and manage campaigns to grow your business and engage your customers.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <CampaignsStats stats={stats} loading={isLoading} />

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Section (Table & Filters) - 8 cols */}
        <div className="space-y-5 lg:col-span-8">
          <AdminCampaignsFilters
            filters={filters}
            onChange={handleFiltersChange}
            branches={branches}
            onCreateCampaign={() => setIsCreateOpen(true)}
          />

          <AdminCampaignsTable
            campaigns={campaigns}
            total={data?.total || 0}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            limit={filters.limit}
            loading={isLoading}
            onPageChange={(p: number) => handleFiltersChange({ page: p })}
            onCreateCampaign={() => setIsCreateOpen(true)}
            onViewCampaign={(c: CampaignItem) => setViewingCampaign(c)}
            onEditCampaign={(c: CampaignItem) => setViewingCampaign(c)}
          />
        </div>

        {/* Right Section (Sidebar with Donut & Quick Actions) - 4 cols */}
        <div className="lg:col-span-4">
          <CampaignsSidebar
            stats={stats}
            onCreateCampaign={() => setIsCreateOpen(true)}
          />
        </div>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        branches={branches}
      />

      {/* Campaign Details Modal */}
      <CampaignDetailsDialog
        campaign={viewingCampaign}
        isOpen={!!viewingCampaign}
        onClose={() => setViewingCampaign(null)}
      />
    </div>
  );
}
