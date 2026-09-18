'use client';

import { PackagePlus, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StockStatusFilter } from '../types/inventory.types';

type InventoryFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  stockStatus: StockStatusFilter;
  onStockStatusChange: (value: StockStatusFilter) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  categoryOptions: Array<{ id: string; name: string }>;
  onAddProduct: () => void;
  onAdjustStock: () => void;
};

export function InventoryFilters({
  search,
  onSearchChange,
  stockStatus,
  onStockStatusChange,
  categoryId,
  onCategoryIdChange,
  categoryOptions,
  onAddProduct,
  onAdjustStock,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Product Name or SKU"
          className="h-10 pr-9"
          aria-label="Search inventory"
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={categoryId}
          onChange={(e) => onCategoryIdChange(e.target.value)}
          aria-label="Category filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) =>
            onStockStatusChange(e.target.value as StockStatusFilter)
          }
          aria-label="Stock status filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="all">All Stock</option>
          <option value="healthy">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={onAddProduct}
        >
          <PackagePlus className="size-4" />
          Add Product
        </Button>

        <Button
          type="button"
          className="h-10 bg-champagne text-white hover:bg-champagne/90"
          onClick={onAdjustStock}
        >
          <Plus className="size-4" />
          Adjust Stock
        </Button>
      </div>
    </div>
  );
}
