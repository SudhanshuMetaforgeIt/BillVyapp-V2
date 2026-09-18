'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCreateService, useCreateServiceCategory } from '../hooks/use-services';

type CreateServiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
};

export function CreateServiceDialog({
  isOpen,
  onClose,
  categories,
  branches,
}: CreateServiceDialogProps) {
  const createServiceMutation = useCreateService();
  const createCategoryMutation = useCreateServiceCategory();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salonId, setSalonId] = useState(branches[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('500');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [description, setDescription] = useState('');

  // Category creation toggle
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId && branches.length === 0) {
      setError('Please add at least one branch location before creating services.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let targetCategoryId = categoryId;

      // If user wants to create a new category inline
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

      await createServiceMutation.mutateAsync({
        salonId: salonId || branches[0].id,
        categoryId: targetCategoryId,
        name: name.trim(),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        description: description.trim() || undefined,
      });

      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to create service. Please check fields and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-text">Add New Service</h3>
            <p className="text-xs text-text-secondary">
              Configure a new service offering and pricing.
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
          {/* Branch selection */}
          <div>
            <label className="block text-xs font-semibold text-text">Branch / Location *</label>
            {branches.length > 0 ? (
              <select
                required
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-xs text-danger">
                No branches found. Please create a branch in My Businesses first.
              </p>
            )}
          </div>

          {/* Service Name */}
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

          {/* Category */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-text">Category *</label>
              <button
                type="button"
                onClick={() => setNewCategoryMode(!newCategoryMode)}
                className="text-xs font-semibold text-champagne hover:underline"
              >
                {newCategoryMode ? 'Select existing' : '+ Create new category'}
              </button>
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
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="">No categories yet (click create new category above)</option>
                )}
              </select>
            )}
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-3">
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
                step="5"
                placeholder="30"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-ivory-soft px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-champagne"
              />
            </div>
          </div>

          {/* Description */}
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
              {loading ? 'Creating…' : 'Create Service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
