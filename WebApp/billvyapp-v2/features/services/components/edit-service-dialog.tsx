'use client';

import { Modal } from '@/components/data/modal';
import { SectionErrorState } from '@/components/layout/section-states';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { fetchService } from '../services/services.service';
import type { ServiceListRow } from '../types/services.types';
import { AddServiceDialog } from './add-service-dialog';

export function EditServiceDialog({ service, categoryOptions, onClose }: {
  service: ServiceListRow;
  categoryOptions: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const query = useScopedQuery(['services', 'detail', service.id], () => fetchService(service.id), {
    capability: 'catalog.write',
    staleTime: 0,
    placeholderData: undefined,
  });

  if (!query.data) {
    return <Modal open title="Edit Service" onClose={onClose}>
      {query.isError ? <SectionErrorState message="We could not load this service." onRetry={() => void query.refetch()} />
        : <p role="status">Loading service…</p>}
    </Modal>;
  }

  // Retain the existing category even if it has since been deactivated.
  const options = categoryOptions.some((category) => category.id === query.data.categoryId)
    ? categoryOptions
    : [{ id: query.data.categoryId, name: service.categoryLabel }, ...categoryOptions];

  return <AddServiceDialog open salonId={query.data.salonId}
    editingService={query.data} categoryOptions={options}
    onOpenChange={(open) => { if (!open) onClose(); }} />;
}
