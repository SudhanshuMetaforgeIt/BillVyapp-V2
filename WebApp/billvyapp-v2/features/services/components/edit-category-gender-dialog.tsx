'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/data/modal';
import { GenderSelect } from '@/components/data/gender-select';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api-client';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { Gender } from '@/lib/gender';
export function EditCategoryGenderDialog({ category, onClose }: {
  category: { id: string; name: string; gender: Gender }; onClose: () => void;
}) {
  const [gender, setGender] = useState<Gender | ''>(category.gender);
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: () => api.patch(`/service-categories/${category.id}`, { gender }),
    onSuccess: () => { void invalidateAfter(queryClient, 'services'); onClose(); },
  });
  return <Modal open title={`Edit ${category.name} gender`} onClose={onClose} busy={update.isPending}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (gender) update.mutate(); }}>
      <GenderSelect value={gender} onChange={setGender} disabled={update.isPending} />
      <p className="text-sm text-text-secondary">Services must match the category gender. A Unisex category can contain services for any gender.</p>
      {update.error && <p role="alert" className="text-sm text-danger">{update.error.message}</p>}
      <Button type="submit" disabled={!gender || update.isPending}>Save gender</Button>
    </form>
  </Modal>;
}
