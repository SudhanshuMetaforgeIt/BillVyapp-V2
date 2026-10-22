'use client';
import { GenderSelect } from '@/components/data/gender-select';
import type { Gender } from '@/lib/gender';

import { ProductRecipeEditor, type ProductRecipe } from "./product-recipe-editor";
import { SelectInput } from '@/components/data/form-fields';
import { useFormValidation } from '@/hooks/use-form-validation';
import { FormValidationErrors } from '@/components/data/form-validation-errors';
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
  categoryOptions: Array<{ id: string; name: string; gender: import('@/lib/gender').Gender }>;
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
  const [productRecipe, setProductRecipe] = useState<ProductRecipe[]>(editingService?.productRecipe ?? []);
  const [gender, setGender] = useState<Gender | ''>(editingService?.gender ?? '');
  const [name, setName] = useState(editingService?.name ?? '');
  const [description, setDescription] = useState(editingService?.description ?? '');
  const [categoryId, setCategoryId] = useState(editingService?.categoryId ?? '');
  const [price, setPrice] = useState(editingService?.price ?? '');
  const [durationMinutes, setDurationMinutes] = useState(String(editingService?.durationMinutes ?? 30));
  const [taxRate, setTaxRate] = useState(editingService?.taxRate ?? '18');

  const validation=useFormValidation(editingService ? 'UpdateServiceDto' : 'CreateServiceDto',{
    ...(editingService ? {} : {salonId}),gender,categoryId,name,description:description.trim() || null,price,durationMinutes,taxRate,productRecipe,
  });
  const clearValidation=validation.clear;
  const create = useCreateService(() => {
    clearValidation();
    onOpenChange(false);
    setName('');
    setGender('');
    setDescription('');
    setPrice('');
    setDurationMinutes('30');
    setTaxRate('18');
  });

  const update = useUpdateService(() => { clearValidation(); onOpenChange(false); });
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, busy, clearValidation]);

  if (!open) return null;

  const priceNum = Number(price);
  const duration = Number(durationMinutes);
  const tax = Number(taxRate);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          clearValidation();
    onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 shadow-xl"
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
          noValidate
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy || !validation.validate() || !gender) return;
              const payload = {
                categoryId,
                gender,
              name: name.trim(),
                description: description.trim() || null,
                price: priceNum,
                durationMinutes: duration,
                taxRate: tax,
                productRecipe,
              };
              if (editingService) update.mutate({ id: editingService.id, payload });
              else create.mutate({ salonId, ...payload });
            }}
          >
            <FormValidationErrors messages={validation.messages} />
            <GenderSelect value={gender} onChange={value => { setGender(value); setCategoryId(''); }} />
            <ProductRecipeEditor salonId={salonId} value={productRecipe} onChange={setProductRecipe} disabled={busy} />
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">Name</Label>
              <Input
                id="svc-name"
                aria-invalid={Boolean(validation.fieldError('name'))} value={name}
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
                <option value="" disabled>Select category</option>
                {categoryOptions.filter(cat => cat.gender === 'UNISEX' || cat.gender === gender).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.gender})
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
                  aria-invalid={Boolean(validation.fieldError('price'))} value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-duration">Duration (mins)</Label>
                <Input
                  id="svc-duration"
                  inputMode="numeric"
                  aria-invalid={Boolean(validation.fieldError('durationMinutes'))} value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-tax">Tax %</Label>
                <Input
                  id="svc-tax"
                  inputMode="decimal"
                  aria-invalid={Boolean(validation.fieldError('taxRate'))} value={taxRate}
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
              <Button type="submit" disabled={busy}>
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
