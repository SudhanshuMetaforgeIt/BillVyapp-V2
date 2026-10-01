'use client';

import { useRef, useState } from 'react';
import { Plus, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { SectionErrorState } from '@/components/layout/section-states';
import { useGSAP, playDashboardEntrance } from '@/lib/animations';
import {
  useAdminServices,
  useBulkCreateServices,
  useUpdateService,
} from '../../hooks/use-admin-services';
import { ServicesStats } from '../services-stats';
import { ServicesBulkBanner } from '../services-bulk-banner';
import { AdminServicesFilters } from './admin-services-filters';
import { AdminServicesTable } from './admin-services-table';
import { CategoriesTabView } from '../categories-tab-view';
import { CreateServiceDialog } from '../create-service-dialog';
import { AdminAddCategoryDialog } from './admin-add-category-dialog';
import { BulkUploadDialog } from './bulk-upload-dialog';
import type {
  ServiceItem,
  ServicesFilterState,
} from '../../types/admin-services.types';
import type { BulkServiceRow } from '../../services/admin-services.service';

export function AdminServicesPageView() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

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
  const updateService = useUpdateService();
  const bulkCreate = useBulkCreateServices();

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

  const openBulkUpload = () => {
    if (!data?.branches?.length) {
      toast.error('Create a shop/branch before uploading services.');
      return;
    }
    setBulkDialogOpen(true);
  };

  const handleBulkUpload = async (input: {
    salonId: string;
    services: BulkServiceRow[];
  }) => {
    const branchName =
      data?.branches.find((b) => b.id === input.salonId)?.name ?? 'selected shop';

    try {
      const result = await bulkCreate.mutateAsync(input);
      if (result.created > 0) {
        toast.success(
          `Added ${result.created} service${result.created === 1 ? '' : 's'} to ${branchName}`,
        );
      }
      if (result.failed.length > 0) {
        toast.error(
          `${result.failed.length} row${result.failed.length === 1 ? '' : 's'} failed — please re-verify and re-upload those rows.`,
        );
      }
      if (result.created === 0 && result.failed.length === 0) {
        toast.error('No services were added. Please re-verify the sheet and re-upload.');
      }
      setActiveTab('services');
      handleFilterChange({ page: 1, branchId: input.salonId });
      setBulkDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Bulk upload failed. Please re-verify the sheet and re-upload.';
      toast.error(msg);
    }
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
      <ServicesStats stats={data?.stats} isLoading={query.isLoading} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
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

        <div className="flex items-center gap-2.5 sm:gap-3">
          {activeTab === 'services' ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-border bg-surface text-text hover:bg-champagne-light/30 shadow-sm"
                disabled={bulkCreate.isPending}
                onClick={openBulkUpload}
              >
                <UploadCloud className="size-4 text-text-secondary" />
                Bulk Upload Services
              </Button>

              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm"
                onClick={() => {
                  setEditingService(null);
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add New Service
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm"
              onClick={() => setCategoryDialogOpen(true)}
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'services' ? (
        <>
          <ServicesBulkBanner
            onUploadClick={openBulkUpload}
            uploading={bulkCreate.isPending}
          />

          <AdminServicesFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={data?.categories ?? []}
            branches={data?.branches ?? []}
          />

          <AdminServicesTable
            services={data?.services ?? []}
            total={data?.total ?? 0}
            currentPage={filters.page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={(page) => handleFilterChange({ page })}
            onAddService={() => {
              setEditingService(null);
              setCreateDialogOpen(true);
            }}
            onEditService={(service) => {
              setEditingService(service);
              setCreateDialogOpen(true);
            }}
          />
        </>
      ) : (
        <CategoriesTabView onAddCategory={() => setCategoryDialogOpen(true)} />
      )}

      <CreateServiceDialog
        isOpen={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingService(null);
        }}
        categories={data?.categories ?? []}
        branches={data?.branches ?? []}
        preferredSalonId={
          filters.branchId !== 'all' ? filters.branchId : undefined
        }
        editingService={editingService}
        onUpdate={async (id, payload) => {
          await updateService.mutateAsync({ id, ...payload });
          toast.success('Service updated');
        }}
      />

      <AdminAddCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        branches={data?.branches ?? []}
      />

      <BulkUploadDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        branches={data?.branches ?? []}
        defaultBranchId={filters.branchId}
        uploading={bulkCreate.isPending}
        onUpload={handleBulkUpload}
      />
    </div>
  );
}
