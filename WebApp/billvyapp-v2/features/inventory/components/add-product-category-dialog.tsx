'use client';

import { useEffect, useId, useState } from 'react';
import { FolderPlus, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProductCategory } from '../hooks/use-inventory-mutations';
import type { ProductCategoryApiItem } from '../types/inventory.types';

type AddProductCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  onSuccess?: (category: ProductCategoryApiItem) => void;
};

export function AddProductCategoryDialog({
  open,
  onOpenChange,
  salonId,
  onSuccess,
}: AddProductCategoryDialogProps) {
  const titleId = useId();
  const descId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = useCreateProductCategory((category) => {
    onOpenChange(false);
    setName('');
    setDescription('');
    onSuccess?.(category);
  });

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);

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

  const trimmedName = name.trim();
  const canSubmit = Boolean(salonId) && trimmedName.length > 0 && !create.isPending;

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
        aria-describedby={descId}
        className="app-surface-card w-full max-w-md p-5 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-champagne-light text-champagne shrink-0">
              <FolderPlus className="size-5" />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-text">
                Add Product Category
              </h2>
              <p id={descId} className="mt-0.5 text-xs text-text-secondary sm:text-sm">
                Create a product category for your salon catalog.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text transition-colors"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            create.mutate({
              salonId,
              name: trimmedName,
              description: description.trim() || null,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="inv-cat-name" className="text-sm font-medium">
              Category Name <span className="text-danger">*</span>
            </Label>
            <Input
              id="inv-cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hair Care, Styling, Skincare"
              autoFocus
              maxLength={191}
              required
              disabled={create.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-cat-description" className="text-sm font-medium">
              Description <span className="text-xs text-text-secondary font-normal">(Optional)</span>
            </Label>
            <Input
              id="inv-cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Shampoos, conditioners, and hair serums"
              maxLength={255}
              disabled={create.isPending}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-champagne text-white hover:bg-champagne/90"
            >
              {create.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
