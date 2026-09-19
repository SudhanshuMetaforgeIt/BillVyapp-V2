'use client';

import { useRef, useState } from 'react';
import { Plus, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionErrorState } from '@/components/layout/section-states';
import { useGSAP, playDashboardEntrance } from '@/lib/animations';
import { useAdminServices } from '../../hooks/use-admin-services';
import { ServicesStats } from '../services-stats';
import { ServicesBulkBanner } from '../services-bulk-banner';
import { AdminServicesFilters } from './admin-services-filters';
import { AdminServicesTable } from './admin-services-table';
import { CategoriesTabView } from '../categories-tab-view';
import { CreateServiceDialog } from '../create-service-dialog';
import type { ServicesFilterState } from '../../types/admin-services.types';

export function AdminServicesPageView() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [filters, setFilters] = useState<ServicesFilterState>({
    search: '',
    categoryId: 'all',
    branchId: 'all',
    status: 'all',
    page: 1,
    limit: 10,
  });

  const query = useAdminServices(filters);
  const data = query.data;

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  const handleFilterChange = (updates: Partial<ServicesFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  if (query.isError) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Unable to load services"
          message="We could not load your services catalog from the database. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7 pb-10">
      {/* ── 1. Top 4 Metric Cards ── */}
      <ServicesStats stats={data?.stats} isLoading={query.isLoading} />

      {/* ── 2. Tabs & Primary Action Buttons Row ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        {/* Left Tabs */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`relative pb-3 text-sm font-bold transition sm:text-base ${
              activeTab === 'services'
                ? 'text-brand-orange'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            All Services
            {activeTab === 'services' ? (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-orange" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`relative pb-3 text-sm font-bold transition sm:text-base ${
              activeTab === 'categories'
                ? 'text-brand-orange'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Service Categories
            {activeTab === 'categories' ? (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-orange" />
            ) : null}
          </button>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-surface text-text hover:bg-champagne-light/30 shadow-sm"
            onClick={() => setActiveTab('services')}
          >
            <UploadCloud className="size-4 text-text-secondary" />
            Bulk Upload Services
          </Button>

          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="size-4" />
            Add New Service
          </Button>
        </div>
      </div>

      {activeTab === 'services' ? (
        <>
          {/* ── 3. Bulk Upload Banner ── */}
          <ServicesBulkBanner />

          {/* ── 4. Search & Filter Bar ── */}
          <ServicesFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={data?.categories ?? []}
            branches={data?.branches ?? []}
          />

          {/* ── 5. Services Table with Empty State ── */}
          <ServicesTable
            services={data?.services ?? []}
            total={data?.total ?? 0}
            currentPage={filters.page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={(page) => handleFilterChange({ page })}
            onAddService={() => setCreateDialogOpen(true)}
          />
        </>
      ) : (
        /* ── Categories Tab ── */
        <CategoriesTabView onAddCategory={() => setCreateDialogOpen(true)} />
      )}

      {/* ── Create Service Modal ── */}
      <CreateServiceDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        categories={data?.categories ?? []}
        branches={data?.branches ?? []}
      />
    </div>
  );
}
