'use client';

import { SelectInput } from '@/components/data/form-fields';
import { createPortal } from 'react-dom';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateService, useUpdateService } from '../hooks/use-service-mutations';
import type { ServiceApiItem } from '../types/services.types';

type AddServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  categoryOptions: Array<{ id: string; name: string }>;
  editingService?: ServiceApiItem;
};

export function AddServiceDialog({
  open,
  onOpenChange,
  salonId,
  categoryOptions,
  editingService,
}: AddServiceDialogProps) {
  const titleId = useId();
  const [name, setName] = useState(editingService?.name ?? '');
  const [description, setDescription] = useState(editingService?.description ?? '');
  const [categoryId, setCategoryId] = useState(editingService?.categoryId ?? categoryOptions[0]?.id ?? '');
  const [price, setPrice] = useState(editingService?.price ?? '');
  const [durationMinutes, setDurationMinutes] = useState(String(editingService?.durationMinutes ?? 30));
  const [taxRate, setTaxRate] = useState(editingService?.taxRate ?? '18');

  const create = useCreateService(() => {
    onOpenChange(false);
    setName('');
    setDescription('');
    setPrice('');
    setDurationMinutes('30');
    setTaxRate('18');
  });

  const update = useUpdateService(() => onOpenChange(false));
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, busy]);

  if (!open) return null;

  const priceNum = Number(price);
  const duration = Number(durationMinutes);
  const tax = Number(taxRate);
  const canSubmit =
    Boolean(salonId) &&
    Boolean(categoryId) &&
    name.trim().length > 0 &&
    price.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum >= 0 &&
    Number.isInteger(duration) &&
    duration >= 1 &&
    Number.isFinite(tax) &&
    tax >= 0 &&
    tax <= 100;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
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
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {editingService ? 'Update this service in your salon catalog.' : 'Create a service for your salon catalog.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {categoryOptions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No categories available. Create a service category first.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || busy) return;
              const payload = {
                categoryId,
                name: name.trim(),
                description: description.trim() || null,
                price: priceNum,
                durationMinutes: duration,
                taxRate: tax,
              };
              if (editingService) update.mutate({ id: editingService.id, payload });
              else create.mutate({ salonId, ...payload });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">Name</Label>
              <Input
                id="svc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">Description (optional)</Label>
              <Input
                id="svc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-cat">Category</Label>
              <SelectInput className="h-10 w-full text-sm font-medium"
                id="svc-cat"
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-price">Price</Label>
                <Input
                  id="svc-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-duration">Duration (mins)</Label>
                <Input
                  id="svc-duration"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-tax">Tax %</Label>
                <Input
                  id="svc-tax"
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
            disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || busy}>
                {busy ? 'Saving…' : editingService ? 'Save changes' : 'Create service'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
