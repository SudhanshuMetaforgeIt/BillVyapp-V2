'use client';

import { SelectInput } from '@/components/data/form-fields';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateServiceCategory } from '../../hooks/use-admin-services';

type AdminAddCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: string; name: string }[];
};

export function AdminAddCategoryDialog({
  open,
  onOpenChange,
  branches,
}: AdminAddCategoryDialogProps) {
  const titleId = useId();
  const [salonId, setSalonId] = useState(branches[0]?.id ?? '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useCreateServiceCategory();

  useEffect(() => {
    if (open && !salonId && branches[0]?.id) {
      setSalonId(branches[0].id);
    }
  }, [open, branches, salonId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const canSubmit =
    Boolean(salonId) && name.trim().length > 0 && !create.isPending;

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
              Add Category
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create a service category for a branch.
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

        {error ? (
          <div className="mb-3 rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSubmit) return;
            setError(null);
            try {
              await create.mutateAsync({
                salonId,
                name: name.trim(),
                description: description.trim() || undefined,
              });
              onOpenChange(false);
              setName('');
              setDescription('');
            } catch (err: unknown) {
              const msg =
                err && typeof err === 'object' && 'message' in err
                  ? String((err as { message: unknown }).message)
                  : 'Failed to create category.';
              setError(msg);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-cat-branch">Branch</Label>
            {branches.length > 0 ? (
              <SelectInput className="h-10 w-full text-sm font-medium"
                id="admin-cat-branch"
                required
                value={salonId}
                onChange={(e) => setSalonId(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <p className="text-xs text-danger">
                No branches found. Create a branch before adding categories.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-cat-name">Name</Label>
            <Input
              id="admin-cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hair"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-cat-desc">Description (optional)</Label>
            <Input
              id="admin-cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            <Button type="submit" disabled={!canSubmit || branches.length === 0}>
              {create.isPending ? 'Creating…' : 'Create category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
