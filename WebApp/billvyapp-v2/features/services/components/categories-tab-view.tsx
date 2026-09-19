'use client';

import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import { StatusBadge } from '@/components/ui/status-badge';
import { useServiceCategories } from '../hooks/use-services';

type CategoriesTabViewProps = {
  onAddCategory?: () => void;
};

export function CategoriesTabView({ onAddCategory }: CategoriesTabViewProps) {
  const { data: categories = [], isLoading } = useServiceCategories();

  if (categories.length === 0) {
    return (
      <div className="app-surface-card py-12 text-center">
        <SectionEmptyState
          title="No categories found"
          message="You haven't defined any service categories yet. Categorize your services (e.g. Hair, Skin, Massage) to organize offerings."
        />
        {onAddCategory ? (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-brand-orange text-white hover:bg-brand-orange-dark"
              onClick={onAddCategory}
            >
              <Plus className="size-4" />
              Add Service Category
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <div key={c.id} className="app-surface-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
                <Layers className="size-4" />
              </span>
              <h4 className="font-bold text-text">{c.name}</h4>
            </div>
            <StatusBadge
              label={c.isActive ? 'Active' : 'Inactive'}
              tone={c.isActive ? 'success' : 'danger'}
            />
          </div>
          {c.description ? (
            <p className="text-xs text-text-secondary">{c.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
