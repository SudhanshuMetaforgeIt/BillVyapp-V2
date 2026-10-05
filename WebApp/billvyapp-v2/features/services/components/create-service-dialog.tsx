'use client';

import { SelectInput } from '@/components/data/form-fields';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  useCreateService,
  useCreateServiceCategory,
} from '../hooks/use-admin-services';
import type { ServiceItem } from '../types/admin-services.types';

type CategoryOption = { id: string; name: string; salonId?: string };

type CreateServiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  branches: { id: string; name: string }[];
  /** Prefill branch from the services filter when adding a new service. */
  preferredSalonId?: string;
  /** When set, dialog edits an existing service instead of creating. */
  editingService?: ServiceItem | null;
  onUpdate?: (id: string, payload: {
    categoryId: string;
    name: string;
    price: number;
    durationMinutes: number;
    description?: string;
  }) => Promise<void>;
};

export function CreateServiceDialog({
  isOpen,
  onClose,
  categories,
  branches,
  preferredSalonId,
  editingService = null,
  onUpdate,
}: CreateServiceDialogProps) {
  const createServiceMutation = useCreateService();
  const createCategoryMutation = useCreateServiceCategory();
  const isEdit = Boolean(editingService);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salonId, setSalonId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('500');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [description, setDescription] = useState('');

  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingService) {
      setSalonId(editingService.salonId);
      setCategoryId(editingService.categoryId);
      setName(editingService.name);
      setPrice(String(editingService.price));
      setDurationMinutes(String(editingService.durationMinutes));
      setDescription(editingService.description ?? '');
      setNewCategoryMode(false);
      setNewCategoryName('');
      setError(null);
      return;
    }
    const defaultSalon =
      (preferredSalonId &&
      branches.some((b) => b.id === preferredSalonId)
        ? preferredSalonId
        : branches[0]?.id) ?? '';
    setSalonId(defaultSalon);
    setCategoryId('');
    setName('');
    setPrice('500');
    setDurationMinutes('30');
    setDescription('');
    setNewCategoryMode(false);
    setNewCategoryName('');
    setError(null);
  }, [isOpen, editingService, branches, preferredSalonId]);

  const salonCategories = useMemo(() => {
    if (!salonId) return categories;
    const scoped = categories.filter(
      (c) => !c.salonId || c.salonId === salonId,
    );
    return scoped.length > 0 ? scoped : categories.filter((c) => !c.salonId);
  }, [categories, salonId]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
    if (
      salonCategories.length > 0 &&
      !salonCategories.some((c) => c.id === categoryId)
    ) {
      setCategoryId(salonCategories[0].id);
    }
  }, [isOpen, isEdit, salonCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId && branches.length === 0) {
      setError('Please add at least one branch location before creating services.');
      return;
    }

    const parsedDuration = Number.parseInt(durationMinutes, 10);
    const parsedPrice = Number(price);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
      setError('Duration must be a whole number of minutes (at least 1).');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a valid number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let targetCategoryId = categoryId;

      if (newCategoryMode && newCategoryName.trim()) {
        const createdCat = await createCategoryMutation.mutateAsync({
          salonId: salonId || branches[0].id,
          name: newCategoryName.trim(),
        });
        targetCategoryId = createdCat.id;
      }

      if (!targetCategoryId) {
        setError('Please select or create a category.');
        setLoading(false);
        return;
      }

      if (isEdit && editingService && onUpdate) {
        await onUpdate(editingService.id, {
          categoryId: targetCategoryId,
          name: name.trim(),
          price: parsedPrice,
          durationMinutes: parsedDuration,
          description: description.trim() || undefined,
        });
      } else {
        await createServiceMutation.mutateAsync({
          salonId: salonId || branches[0].id,
          categoryId: targetCategoryId,
          name: name.trim(),
          price: parsedPrice,
          durationMinutes: parsedDuration,
          description: description.trim() || undefined,
        });
      }

      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : `Failed to ${isEdit ? 'update' : 'create'} service. Please check fields and try again.`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="app-dialog relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-text">
              {isEdit ? 'Edit Service' : 'Add New Service'}
            </h3>
            <p className="text-xs text-text-secondary">
              {isEdit
                ? 'Update service details, pricing, and duration.'
                : 'Pick a shop/branch first — each shop can have its own services and pricing.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text">Branch / Location *</label>
            {branches.length > 0 ? (
              <SelectInput className="mt-1 h-10 w-full text-sm font-medium disabled:opacity-60"
                required
                value={salonId}
                disabled={isEdit}
                onChange={(e) => {
                  setSalonId(e.target.value);
                  setCategoryId('');
                }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <p className="mt-1 text-xs text-danger">
                No branches found. Please create a branch in My Businesses first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text">Service Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Hair Cut, Hair Spa, Facial..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text">Category *</label>
              {!isEdit ? (
                <button
                  type="button"
                  onClick={() => setNewCategoryMode(!newCategoryMode)}
                  className="text-xs font-semibold text-champagne hover:underline"
                >
                  {newCategoryMode ? 'Select existing' : '+ Create new category'}
                </button>
              ) : null}
            </div>

            {newCategoryMode ? (
              <input
                type="text"
                required
                placeholder="e.g. Hair, Skin, Grooming, Spa..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            ) : (
              <SelectInput className="mt-1 h-10 w-full text-sm font-medium"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {salonCategories.length > 0 ? (
                  salonCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="">No categories yet (click create new category above)</option>
                )}
              </SelectInput>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 panel-md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text">Price (₹) *</label>
              <input
                type="number"
                required
                min={0}
                step="1"
                placeholder="500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text">Duration (Minutes) *</label>
              <input
                type="number"
                required
                min={1}
                step="1"
                placeholder="30"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief description of what is included in this service..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || branches.length === 0}
              className="bg-brand-orange text-white hover:bg-brand-orange-dark"
            >
              {loading
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
