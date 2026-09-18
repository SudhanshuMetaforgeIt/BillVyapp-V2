'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdjustStock } from '../hooks/use-inventory-mutations';
import type { AdjustStockPayload, InventoryListRow } from '../types/inventory.types';

type AdjustStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  productOptions: Array<{ id: string; name: string; sku: string }>;
  presetRow?: InventoryListRow | null;
};

type MovementType = AdjustStockPayload['movementType'];

export function AdjustStockDialog({
  open,
  onOpenChange,
  salonId,
  productOptions,
  presetRow = null,
}: AdjustStockDialogProps) {
  const titleId = useId();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [movementType, setMovementType] = useState<MovementType>('ADJUSTMENT');
  const [notes, setNotes] = useState('');

  const adjust = useAdjustStock(() => {
    onOpenChange(false);
    setQuantity('1');
    setMovementType('ADJUSTMENT');
    setNotes('');
  });

  useEffect(() => {
    if (!open) return;
    setProductId(presetRow?.productId ?? productOptions[0]?.id ?? '');
    setQuantity('1');
    setMovementType('ADJUSTMENT');
    setNotes('');
  }, [open, presetRow, productOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !adjust.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, adjust.isPending]);

  if (!open) return null;

  const qty = Number.parseInt(quantity, 10);
  const canSubmit =
    Boolean(salonId) &&
    Boolean(productId) &&
    Number.isInteger(qty) &&
    qty !== 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !adjust.isPending) {
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
              Adjust Stock
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Use a signed quantity (e.g. +10 or -2). Creates inventory if needed.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
            onClick={() => onOpenChange(false)}
            disabled={adjust.isPending}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || adjust.isPending) return;
            adjust.mutate({
              salonId,
              productId,
              quantity: qty,
              movementType,
              notes: notes.trim() || null,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="inv-adjust-product">Product</Label>
            <select
              id="inv-adjust-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={Boolean(presetRow)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne disabled:opacity-70"
            >
              {productOptions.length === 0 ? (
                <option value="">No products available</option>
              ) : (
                productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-adjust-qty">Quantity delta</Label>
              <Input
                id="inv-adjust-qty"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10 or -2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-adjust-type">Movement type</Label>
              <select
                id="inv-adjust-type"
                value={movementType}
                onChange={(e) =>
                  setMovementType(e.target.value as MovementType)
                }
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="RETURN">Return</option>
                <option value="DAMAGE">Damage</option>
                <option value="TRANSFER_IN">Transfer in</option>
                <option value="TRANSFER_OUT">Transfer out</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-adjust-notes">Notes (optional)</Label>
            <Input
              id="inv-adjust-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjust.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || adjust.isPending}>
              {adjust.isPending ? 'Saving…' : 'Save adjustment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
