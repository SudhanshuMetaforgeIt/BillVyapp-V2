'use client';

import { useState } from 'react';

import { DataTable, type Column } from '@/components/data/data-table';
import { FormField, PageHeading } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/types/models';
import { listAuditLogs, type AuditLogQuery } from '../services/audit.service';

const PAGE_SIZE = 20;

function shortId(id: string | null): string {
  return id ? `${id.slice(0, 8)}…` : '—';
}

const COLUMNS: Column<AuditLog>[] = [
  {
    id: 'when',
    header: 'When',
    cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
  },
  {
    id: 'action',
    header: 'Action',
    cell: (row) => <span className="font-medium">{row.action}</span>,
  },
  { id: 'entity', header: 'Entity', cell: (row) => row.entityType },
  {
    id: 'entityId',
    header: 'Entity ID',
    cell: (row) => <code className="text-xs text-text-secondary">{shortId(row.entityId)}</code>,
  },
  {
    id: 'user',
    header: 'User',
    cell: (row) => <code className="text-xs text-text-secondary">{shortId(row.userId)}</code>,
  },
  {
    id: 'ip',
    header: 'IP',
    cell: (row) => <span className="text-xs text-text-secondary">{row.ipAddress ?? '—'}</span>,
  },
];

/**
 * Audit trail for SUPER_ADMIN (all), ADMIN (franchise) and MANAGER (salon);
 * the backend applies the scope.
 */
export function AuditLogsView() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const debouncedAction = useDebouncedValue(action.trim().toUpperCase());
  const debouncedEntity = useDebouncedValue(entityType.trim());

  const query: AuditLogQuery = {
    page,
    limit: PAGE_SIZE,
    action: debouncedAction,
    entityType: debouncedEntity,
    dateFrom,
    dateTo,
  };

  const logs = useScopedQuery(['audit', query], () => listAuditLogs(query), {
    capability: 'audit.read',
  });

  const resetPage = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Audit logs"
        description="Every create, update and status change recorded by the backend."
      />

      <DataTable
        columns={COLUMNS}
        query={logs}
        rowKey={(row) => row.id}
        onPageChange={setPage}
        onRowClick={setSelected}
        noun="entries"
        emptyTitle="No audit entries"
        emptyMessage="No activity matches these filters."
        toolbar={
          <>
            <Input
              aria-label="Action"
              placeholder="Action, e.g. BILL_CREATED"
              value={action}
              onChange={(e) => resetPage(setAction)(e.target.value)}
              className="w-52"
            />
            <Input
              aria-label="Entity type"
              placeholder="Entity, e.g. Bill"
              value={entityType}
              onChange={(e) => resetPage(setEntityType)(e.target.value)}
              className="w-40"
            />
            <Input
              aria-label="From date"
              type="date"
              value={dateFrom}
              onChange={(e) => resetPage(setDateFrom)(e.target.value)}
              className="w-40"
            />
            <Input
              aria-label="To date"
              type="date"
              value={dateTo}
              onChange={(e) => resetPage(setDateTo)(e.target.value)}
              className="w-40"
            />
          </>
        }
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.action ?? ''}
        description={selected ? formatDateTime(selected.createdAt) : undefined}
        className="max-w-2xl"
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-text-secondary">Entity</dt>
              <dd>{selected.entityType}</dd>
              <dt className="text-text-secondary">Entity ID</dt>
              <dd className="break-all font-mono text-xs">{selected.entityId ?? '—'}</dd>
              <dt className="text-text-secondary">User ID</dt>
              <dd className="break-all font-mono text-xs">{selected.userId ?? '—'}</dd>
              <dt className="text-text-secondary">Salon ID</dt>
              <dd className="break-all font-mono text-xs">{selected.salonId ?? '—'}</dd>
              <dt className="text-text-secondary">User agent</dt>
              <dd className="break-all text-xs">{selected.userAgent ?? '—'}</dd>
            </dl>
            {(['oldData', 'newData'] as const).map((key) => (
              <FormField key={key} id={key} label={key === 'oldData' ? 'Before' : 'After'}>
                <pre
                  id={key}
                  className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs"
                >
                  {selected[key] ? JSON.stringify(selected[key], null, 2) : '—'}
                </pre>
              </FormField>
            ))}
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
