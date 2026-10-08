'use client';
import dynamic from 'next/dynamic';

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useServices } from '../hooks/use-services';
import type {
  ServiceStatusFilter,
  ServicesTab,
  ServiceListRow,
} from '../types/services.types';
const LazyAddCategoryDialog = dynamic(() => import('./add-category-dialog').then((module) => module.AddCategoryDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AddCategoryDialog(props: import('react').ComponentProps<typeof import('./add-category-dialog').AddCategoryDialog>) {
  return props.open ? <LazyAddCategoryDialog {...props} /> : null;
}
const LazyAddServiceDialog = dynamic(() => import('./add-service-dialog').then((module) => module.AddServiceDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AddServiceDialog(props: import('react').ComponentProps<typeof import('./add-service-dialog').AddServiceDialog>) {
  return props.open ? <LazyAddServiceDialog {...props} /> : null;
}
import { CategoriesTable } from './categories-table';
import { ServicesFilters } from './services-filters';
import { ServicesTable } from './services-table';
import { ServicesTabs } from './services-tabs';
import { EditServiceDialog } from './edit-service-dialog';

import { can } from '@/lib/capabilities';

const PAGE_SIZE = 10;

export function ServicesPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const user = useCurrentUser();
  const salonId = user?.salonId ?? '';

  const [tab, setTab] = useState<ServicesTab>('services');
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ServiceStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceListRow | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, categoryId, status, tab]);

  const query = useServices({
    tab,
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    categoryId,
    status,
  });

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess, tab], scope: rootRef },
  );

  if (!salonId) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Salon not linked"
          message="Your account is not linked to a salon, so services cannot be managed."
        />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Services unavailable"
          message="We could not load services. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;
  const emptyMeta = {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
          className="xl:grid-cols-4"
          skeletonCount={4}
        />

        <div
          className="app-surface-card overflow-hidden"
          data-dash-animate="section"
        >
          <ServicesTabs
            value={tab}
            onChange={(value) => {
              startTransition(() => {
                setTab(value);
                setSearchInput('');
                setCategoryId('');
                setStatus('all');
              });
            }}
          />

          <div className="space-y-4 p-4 sm:p-5">
            <ServicesFilters
              tab={tab}
              search={searchInput}
              onSearchChange={setSearchInput}
              categoryId={categoryId}
              onCategoryIdChange={(value) => {
                startTransition(() => setCategoryId(value));
              }}
              categoryOptions={data?.categoryOptions ?? []}
              status={status}
              onStatusChange={(value) => {
                startTransition(() => setStatus(value));
              }}
              onPrimaryAction={
                can(user, 'catalog.write')
                  ? () => {
                      if (tab === 'services') setAddServiceOpen(true);
                      else setAddCategoryOpen(true);
                    }
                  : undefined
              }
            />

            {tab === 'services' ? (
              <ServicesTable
                onEditService={can(user, 'catalog.write') ? setEditingService : undefined}
                rows={data?.serviceRows ?? []}
                meta={{ ...(data?.serviceMeta ?? emptyMeta), page }}
                isLoading={query.isLoading && !data}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                onPageChange={(next) => {
                  startTransition(() => setPage(next));
                }}
              />
            ) : (
              <CategoriesTable
                rows={data?.categoryRows ?? []}
                meta={{ ...(data?.categoryMeta ?? emptyMeta), page }}
                isLoading={query.isLoading && !data}
                isError={query.isError}
                onRetry={() => void query.refetch()}
                onPageChange={(next) => {
                  startTransition(() => setPage(next));
                }}
              />
            )}
          </div>
        </div>
      </div>

      <AddServiceDialog
        open={addServiceOpen}
        onOpenChange={setAddServiceOpen}
        salonId={salonId}
        categoryOptions={data?.categoryOptions ?? []}
      />
      <AddCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        salonId={salonId}
      />
      {editingService && <EditServiceDialog key={editingService.id}
        service={editingService} categoryOptions={data?.categoryOptions ?? []}
        onClose={() => setEditingService(null)} />}
    </>
  );
}
