'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { DataTable, type Column } from '@/components/data/data-table';
import { FormField, MutationError, PageHeading, SelectInput } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { can } from '@/lib/capabilities';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { Vendor, VendorInput } from '@/types/models';
import {
  createVendor,
  listVendors,
  updateVendor,
  updateVendorStatus,
  type VendorQuery,
} from '../services/procurement.service';

const PAGE_SIZE = 15;

const EMPTY: VendorInput = {
  name: '',
  code: '',
  contactPerson: '',
  phone: '',
  email: '',
  gstNumber: '',
  city: '',
  notes: '',
};

function toPayload(form: VendorInput): VendorInput {
  const opt = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    contactPerson: opt(form.contactPerson),
    phone: opt(form.phone),
    email: opt(form.email),
    gstNumber: opt(form.gstNumber),
    city: opt(form.city),
    notes: opt(form.notes),
  };
}

function VendorDialog({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VendorInput>(
    vendor
      ? {
          name: vendor.name,
          code: vendor.code,
          contactPerson: vendor.contactPerson ?? '',
          phone: vendor.phone ?? '',
          email: vendor.email ?? '',
          gstNumber: vendor.gstNumber ?? '',
          city: vendor.city ?? '',
          notes: vendor.notes ?? '',
        }
      : EMPTY,
  );

  const save = useMutation<Vendor, ApiError, VendorInput>({
    mutationFn: (input) => (vendor ? updateVendor(vendor.id, input) : createVendor(input)),
    onSuccess: (saved) => {
      toast.success(`${saved.name} saved`);
      void invalidateAfter(queryClient, 'vendors');
      onClose();
    },
  });

  const field = (key: keyof VendorInput, label: string, type = 'text') => (
    <FormField id={`vendor-${key}`} label={label}>
      <Input
        id={`vendor-${key}`}
        type={type}
        value={form[key] ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </FormField>
  );

  const valid = form.name.trim().length > 0 && form.code.trim().length > 0;

  return (
    <Modal open onClose={onClose} busy={save.isPending} title={vendor ? 'Edit vendor' : 'New vendor'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate(toPayload(form));
        }}
      >
        <div className="grid gap-3 panel-md:grid-cols-2">
          {field('name', 'Name')}
          {field('code', 'Code')}
          {field('contactPerson', 'Contact person')}
          {field('phone', 'Phone', 'tel')}
          {field('email', 'Email', 'email')}
          {field('gstNumber', 'GST number')}
          {field('city', 'City')}
        </div>
        {field('notes', 'Notes')}
        <MutationError error={save.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save vendor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function VendorsView() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [editing, setEditing] = useState<Vendor | null | 'new'>(null);
  const debounced = useDebouncedValue(search);
  const canWrite = can(user, 'vendors.write');

  const query: VendorQuery = {
    page,
    limit: PAGE_SIZE,
    search: debounced,
    isActive: status === 'all' ? undefined : status === 'active',
  };
  const vendors = useScopedQuery(['vendors', query], () => listVendors(query), {
    capability: 'vendors.read',
  });

  const toggle = useMutation<Vendor, ApiError, Vendor>({
    mutationFn: (v) => updateVendorStatus(v.id, !v.isActive),
    onSuccess: (v) => {
      toast.success(`${v.name} ${v.isActive ? 'activated' : 'deactivated'}`);
      void invalidateAfter(queryClient, 'vendors');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  const columns: Column<Vendor>[] = useMemo(() => {
    const cols: Column<Vendor>[] = [
      {
        id: 'name',
        header: 'Vendor',
        cell: (v) => (
          <div>
            <p className="font-semibold">{v.name}</p>
            <p className="text-xs text-text-secondary">{v.code}</p>
          </div>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        cell: (v) => (
          <div>
            <p>{v.contactPerson ?? '—'}</p>
            <p className="text-xs text-text-secondary">{v.phone ?? v.email ?? ''}</p>
          </div>
        ),
      },
      { id: 'gst', header: 'GST', cell: (v) => v.gstNumber ?? '—' },
      { id: 'city', header: 'City', cell: (v) => v.city ?? '—' },
      {
        id: 'status',
        header: 'Status',
        cell: (v) => (
          <StatusBadge tone={v.isActive ? 'success' : 'neutral'} label={v.isActive ? 'Active' : 'Inactive'} />
        ),
      },
    ];
    if (canWrite) {
      cols.push({
        id: 'actions',
        header: 'Actions',
        cell: (v) => (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(v)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant={v.isActive ? 'destructive' : 'secondary'}
              disabled={toggle.isPending && toggle.variables?.id === v.id}
              onClick={() => toggle.mutate(v)}
            >
              {v.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        ),
      });
    }
    return cols;
  }, [canWrite, toggle]);

  return (
    <div className="space-y-5">
      <PageHeading
        title="Vendors"
        description="Suppliers used for purchase orders."
        actions={
          canWrite ? (
            <Button type="button" onClick={() => setEditing('new')}>
              <Plus className="size-4" /> New vendor
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        query={vendors}
        rowKey={(v) => v.id}
        onPageChange={setPage}
        noun="vendors"
        emptyTitle="No vendors"
        emptyMessage={canWrite ? 'Add your first supplier to start raising purchases.' : 'No vendors found.'}
        toolbar={
          <>
            <Input
              aria-label="Search vendors"
              placeholder="Search name, code, phone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64"
            />
            <SelectInput
              aria-label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
              className="w-36"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </SelectInput>
          </>
        }
      />
      {editing ? (
        <VendorDialog vendor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
