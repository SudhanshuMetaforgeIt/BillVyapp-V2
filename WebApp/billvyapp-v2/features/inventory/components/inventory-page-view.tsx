'use client';

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
import { useInventory } from '../hooks/use-inventory';
import type {
  InventoryListRow,
  StockStatusFilter,
} from '../types/inventory.types';
import { AddProductDialog } from './add-product-dialog';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { InventoryFilters } from './inventory-filters';
import { InventoryTable } from './inventory-table';

const PAGE_SIZE = 10;

export function InventoryPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const user = useCurrentUser();
  const salonId = user?.salonId ?? '';

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [presetRow, setPresetRow] = useState<InventoryListRow | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, stockStatus, categoryId]);

  const query = useInventory({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    stockStatus,
    categoryId,
  });

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (!salonId) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Salon not linked"
          message="Your account is not linked to a salon, so inventory cannot be managed."
        />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Inventory unavailable"
          message="We could not load inventory. Please try again."
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

        <div className="space-y-4">
          <InventoryFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            stockStatus={stockStatus}
            onStockStatusChange={(value) => {
              startTransition(() => setStockStatus(value));
            }}
            categoryId={categoryId}
            onCategoryIdChange={(value) => {
              startTransition(() => setCategoryId(value));
            }}
            categoryOptions={data?.categoryOptions ?? []}
            onAddProduct={() => setAddOpen(true)}
            onAdjustStock={() => {
              setPresetRow(null);
              setAdjustOpen(true);
            }}
          />

          <InventoryTable
            rows={data?.rows ?? []}
            meta={data?.meta ?? emptyMeta}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            onPageChange={(next) => {
              startTransition(() => setPage(next));
            }}
            onAdjustRow={(row) => {
              setPresetRow(row);
              setAdjustOpen(true);
            }}
          />
        </div>
      </div>

      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        salonId={salonId}
        categoryOptions={data?.categoryOptions ?? []}
      />

      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        salonId={salonId}
        productOptions={data?.productOptions ?? []}
        presetRow={presetRow}
      />
    </>
  );
}
