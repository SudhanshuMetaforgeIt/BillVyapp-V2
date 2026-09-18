'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateService } from '../hooks/use-service-mutations';

type AddServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salonId: string;
  categoryOptions: Array<{ id: string; name: string }>;
};

export function AddServiceDialog({
  open,
  onOpenChange,
  salonId,
  categoryOptions,
}: AddServiceDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [taxRate, setTaxRate] = useState('18');

  const create = useCreateService(() => {
    onOpenChange(false);
    setName('');
    setDescription('');
    setPrice('');
    setDurationMinutes('30');
    setTaxRate('18');
  });

  useEffect(() => {
    if (!open) return;
    setCategoryId(categoryOptions[0]?.id ?? '');
  }, [open, categoryOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const priceNum = Number(price);
  const duration = Number.parseInt(durationMinutes, 10);
  const tax = Number(taxRate);
  const canSubmit =
    Boolean(salonId) &&
    Boolean(categoryId) &&
    name.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum >= 0 &&
    Number.isInteger(duration) &&
    duration >= 1 &&
    Number.isFinite(tax) &&
    tax >= 0 &&
    tax <= 100;

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
              Add New Service
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create a service for your salon catalog.
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
          <p className="text-sm text-text-secondary">
            No categories available. Create a service category first.
          </p>
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
                description: description.trim() || null,
                price: priceNum,
                durationMinutes: duration,
                taxRate: tax,
              });
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
              <select
                id="svc-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || create.isPending}>
                {create.isPending ? 'Creating…' : 'Create service'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
