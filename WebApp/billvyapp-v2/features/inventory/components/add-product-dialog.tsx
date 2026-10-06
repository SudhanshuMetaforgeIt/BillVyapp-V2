'use client';

import { SelectInput } from '@/components/data/form-fields';

import { useEffect, useId, useState } from 'react';
import { FolderPlus, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProduct } from '../hooks/use-inventory-mutations';
import { AddProductCategoryDialog } from './add-product-category-dialog';

type AddProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  categoryOptions: Array<{ id: string; name: string }>;
  onAddCategory?: () => void;
};

export function AddProductDialog({
  open,
  onOpenChange,
  salonId,
  categoryOptions,
  onAddCategory,
}: AddProductDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [unit, setUnit] = useState('PCS');
  const [createCatOpen, setCreateCatOpen] = useState(false);

  const create = useCreateProduct(() => {
    onOpenChange(false);
    setName('');
    setSku('');
    setSellingPrice('');
    setCostPrice('');
    setReorderLevel('5');
    setUnit('PCS');
  });

  useEffect(() => {
    if (!open) return;
    if (categoryOptions.length > 0 && (!categoryId || !categoryOptions.some((c) => c.id === categoryId))) {
      setCategoryId(categoryOptions[0]?.id ?? '');
    }
  }, [open, categoryOptions, categoryId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const price = Number(sellingPrice);
  const cost = costPrice.trim() === '' ? undefined : Number(costPrice);
  const reorder = Number.parseInt(reorderLevel, 10);
  const canSubmit =
    Boolean(salonId) &&
    Boolean(categoryId) &&
    name.trim().length > 0 &&
    sku.trim().length > 0 &&
    Number.isFinite(price) &&
    price >= 0 &&
    (cost === undefined || (Number.isFinite(cost) && cost >= 0)) &&
    Number.isInteger(reorder) &&
    reorder >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card w-full max-w-md p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text">
              Add Product
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Creates a catalog product. Adjust stock afterward to track inventory.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {categoryOptions.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-dashed border-border bg-ivory-soft/60 p-6 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-champagne-light text-champagne">
              <FolderPlus className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">No product categories found</p>
              <p className="mt-1 text-xs text-text-secondary">
                You must create at least one product category before adding products to your inventory.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => (onAddCategory ? onAddCategory() : setCreateCatOpen(true))}
              className="bg-champagne text-white hover:bg-champagne/90"
            >
              <FolderPlus className="mr-1.5 size-4" />
              Create Product Category
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || create.isPending) return;
              create.mutate({
                salonId,
                categoryId,
                name: name.trim(),
                sku: sku.trim(),
                sellingPrice: price,
                costPrice: cost,
                reorderLevel: reorder,
                unit: unit.trim() || 'PCS',
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="inv-product-name">Name</Label>
              <Input
                id="inv-product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-3 panel-md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-product-sku">SKU</Label>
                <Input
                  id="inv-product-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-product-unit">Unit</Label>
                <Input
                  id="inv-product-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="inv-product-category">Category</Label>
                <button
                  type="button"
                  onClick={() => (onAddCategory ? onAddCategory() : setCreateCatOpen(true))}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-champagne hover:underline"
                >
                  <Plus className="size-3" />
                  New Category
                </button>
              </div>
              <SelectInput className="h-10 w-full text-sm font-medium"
                id="inv-product-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div className="grid gap-3 panel-md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-product-sell">Selling price</Label>
                <Input
                  id="inv-product-sell"
                  inputMode="decimal"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-product-cost">Cost price</Label>
                <Input
                  id="inv-product-cost"
                  inputMode="decimal"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-product-reorder">Reorder level</Label>
              <Input
                id="inv-product-reorder"
                inputMode="numeric"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || create.isPending}>
                {create.isPending ? 'Creating…' : 'Create product'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <AddProductCategoryDialog
        open={createCatOpen}
        onOpenChange={setCreateCatOpen}
        salonId={salonId}
        onSuccess={(category) => {
          setCategoryId(category.id);
        }}
      />
    </div>
  );
}
