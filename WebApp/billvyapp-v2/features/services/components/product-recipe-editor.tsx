'use client';

import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { api } from '@/services/api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectInput } from '@/components/data/form-fields';
import { AddProductDialog } from '@/features/inventory/components/add-product-dialog';
import type { ProductApiItem, PaginatedResponse, ProductCategoryApiItem } from '@/features/inventory/types/inventory.types';

import { validProductRecipe, type ProductRecipe } from '../utils/product-recipe';
export { validProductRecipe };
export type { ProductRecipe };

export function ProductRecipeEditor({ salonId, value, onChange, disabled = false }: {
  salonId: string; value: ProductRecipe[]; onChange: (recipe: ProductRecipe[]) => void; disabled?: boolean;
}) {
  const [addingProduct, setAddingProduct] = useState(false);
  const [search, setSearch] = useState('');
  const products = useScopedQuery(['products', 'recipe', salonId, search], () =>
    api.get<PaginatedResponse<ProductApiItem>>('/products', { params: { salonId, isActive: true, limit: 100, search: search || undefined } }),
    { enabled: Boolean(salonId), capability: 'catalog.write', placeholderData: undefined });
  const categories = useScopedQuery(['product-categories', 'recipe', salonId], () =>
    api.get<PaginatedResponse<ProductCategoryApiItem>>('/product-categories', { params: { salonId, limit: 100 } }),
    { enabled: addingProduct && Boolean(salonId), capability: 'catalog.write' });
  function patch(index: number, change: Partial<ProductRecipe>) {
    onChange(value.map((row, i) => i === index ? { ...row, ...change } : row));
  }
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="font-semibold">Products used per service</h3>
    <p className="text-xs text-text-secondary">Percentage is of one full package. Fixed quantity uses ml, grams, or pieces. Stock is deducted when the bill completes, including free membership services.</p>
    <Input aria-label="Search inventory products" placeholder="Search inventory products" value={search} onChange={(e) => setSearch(e.target.value)} />
    {products.isError && <p role="alert">Products could not load. <button type="button" className="underline" onClick={() => void products.refetch()}>Retry</button></p>}
    {value.map((row, index) => {
      const product = products.data?.data.find((p) => p.id === row.productId);
      const size = Number(product?.packageSize ?? 1);
      const used = row.mode === 'PERCENT' ? size * row.value / 100 : row.value;
      return <div key={index} className="space-y-2 rounded-lg border border-border p-3">
        <SelectInput aria-label={`Product ${index + 1}`} value={row.productId} disabled={disabled} onChange={(e) => patch(index, { productId: e.target.value })}>
          <option value="">Select product</option>
          {row.productId && !product && <option value={row.productId}>Selected product (search to view details)</option>}
          {products.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.packageSize ?? 1} {p.measurementUnit ?? 'PCS'} / package</option>)}
        </SelectInput>
        <div className="flex gap-2">
          <SelectInput aria-label={`Usage mode ${index + 1}`} value={row.mode} disabled={disabled} onChange={(e) => patch(index, { mode: e.target.value as ProductRecipe['mode'] })}>
            <option value="PERCENT">% of package</option><option value="FIXED">Fixed quantity</option>
          </SelectInput>
          <Input type="number" aria-label={`Usage quantity ${index + 1}`} min="0.0001" max={row.mode === 'PERCENT' ? 100 : 1000000} step="0.0001" value={row.value || ''} disabled={disabled} onChange={(e) => patch(index, { value: Number(e.target.value) })} />
          <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove</Button>
        </div>
        {product && <p className="text-xs">Estimated usage: {Number(used.toFixed(3))} {product.measurementUnit ?? 'PCS'} per service</p>}
      </div>;
    })}
    <div className="flex gap-2">
      <Button type="button" variant="outline" disabled={disabled || value.length >= 30 || !salonId} onClick={() => onChange([...value, { productId: '', mode: 'PERCENT', value: 5 }])}>Add product usage</Button>
      <Button type="button" variant="outline" disabled={disabled || !salonId} onClick={() => setAddingProduct(true)}>Create inventory product</Button>
    </div>
    {!validProductRecipe(value) && <p role="alert" className="text-xs text-danger">Select distinct products and enter a valid quantity (percentage up to 100%).</p>}
    {addingProduct && createPortal(<AddProductDialog open salonId={salonId} categoryOptions={categories.data?.data ?? []} onOpenChange={(open) => { setAddingProduct(open); if (!open) void products.refetch(); }} />, document.body)}
  </section>;
}
