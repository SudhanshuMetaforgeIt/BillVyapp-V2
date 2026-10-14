'use client';
import { ConsumptionReport } from "./consumption-report";
import dynamic from 'next/dynamic';

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { InventoryNavigation } from './inventory-navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useInventory } from '../hooks/use-inventory';
import type {
  InventoryListRow,
  StockStatusFilter,
} from '../types/inventory.types';
const LazyAddProductCategoryDialog = dynamic(() => import('./add-product-category-dialog').then((module) => module.AddProductCategoryDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AddProductCategoryDialog(props: import('react').ComponentProps<typeof import('./add-product-category-dialog').AddProductCategoryDialog>) {
  return props.open ? <LazyAddProductCategoryDialog {...props} /> : null;
}
const LazyAdjustStockDialog = dynamic(() => import('./adjust-stock-dialog').then((module) => module.AdjustStockDialog), { loading: () => <p role="status">Opening dialog…</p> });
function AdjustStockDialog(props: import('react').ComponentProps<typeof import('./adjust-stock-dialog').AdjustStockDialog>) {
  return props.open ? <LazyAdjustStockDialog {...props} /> : null;
}
import { InventoryFilters } from './inventory-filters';
import { InventoryTable } from './inventory-table';

import { can } from '@/lib/capabilities';

const PAGE_SIZE = 10;

export function InventoryPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const user = useCurrentUser();
  const salonId = user?.salonId ?? '';
  const canWrite = can(user, 'inventory.adjust');

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [presetRow, setPresetRow] = useState<InventoryListRow | null>(null);

  useEffect(() => {
    // Existing dialog/filter synchronization keeps persisted form selections current.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div ref={rootRef} className="app-catalog-page space-y-6 lg:space-y-7">
        <InventoryNavigation />

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
            onAddCategory={canWrite ? () => setAddCategoryOpen(true) : undefined}
            onAdjustStock={
              canWrite
                ? () => {
                    setPresetRow(null);
                    setAdjustOpen(true);
                  }
                : undefined
            }
          />

          <ConsumptionReport salonId={salonId} />
        <InventoryTable
            rows={data?.rows ?? []}
            meta={data?.meta ?? emptyMeta}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            onPageChange={(next) => {
              startTransition(() => setPage(next));
            }}
            onAdjustRow={
              canWrite
                ? (row) => {
                    setPresetRow(row);
                    setAdjustOpen(true);
                  }
                : undefined
            }
          />
        </div>
      </div>

      <AddProductCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        salonId={salonId}
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
