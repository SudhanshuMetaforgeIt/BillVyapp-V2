'use client';
import { InventoryNavigation } from './inventory-navigation';

import { ConsumptionReport } from "./consumption-report";
import { useState } from 'react';

import { DataTable, type Column } from '@/components/data/data-table';
import { PageHeading, SelectInput } from '@/components/data/form-fields';
import { SalonPicker } from '@/features/salons/components/salon-picker';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StockMovement, StockMovementType } from '@/types/models';
import { listStockMovements, type StockMovementQuery } from '../services/stock-movements.service';

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<StockMovementType, string> = {
  CONSUMPTION: "Service consumption",
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  DAMAGE: 'Damage',
  TRANSFER_IN: 'Transfer in',
  TRANSFER_OUT: 'Transfer out',
};

const COLUMNS: Column<StockMovement>[] = [
  { id: 'when', header: 'When', cell: (m) => formatDateTime(m.createdAt) },
  { id: 'product', header: 'Product', cell: (m) => <span className="font-medium">{m.productName}</span> },
  { id: 'type', header: 'Type', cell: (m) => TYPE_LABEL[m.movementType] },
  {
    id: 'qty',
    header: 'Qty (packages)',
    cell: (m) => (
      <span className={cn('font-semibold tabular-nums', m.quantity < 0 || ['SALE', 'CONSUMPTION'].includes(m.movementType) ? 'text-danger' : 'text-emerald')}>
        {['SALE', 'CONSUMPTION'].includes(m.movementType) ? `-${Math.abs(m.quantity)}` : m.quantity > 0 ? `+${m.quantity}` : m.quantity}
      </span>
    ),
  },
  { id: 'balance', header: 'Balance after', cell: (m) => <span className="tabular-nums">{m.balanceAfter}</span> },
  {
    id: 'cost',
    header: 'Unit cost',
    cell: (m) => (m.unitCost ? formatCurrency(Number(m.unitCost)) : '—'),
  },
  {
    id: 'ref',
    header: 'Reference',
    cell: (m) => <span className="text-xs text-text-secondary">{m.notes ?? m.referenceType ?? '—'}{m.consumptionDetails?.map((detail, i) => <span key={i} className="block">{detail.serviceName ?? 'Service'} × {detail.serviceQuantity}: {Number((detail.packagesUsed * detail.packageSize).toFixed(3))} {detail.measurementUnit}</span>)}</span>,
  },
];

export function StockMovementsView() {
  const user = useCurrentUser();
  const [page, setPage] = useState(1);
  const [salonId, setSalonId] = useState('');
  const [movementType, setMovementType] = useState<StockMovementType | ''>('');

  const query: StockMovementQuery = {
    page,
    limit: PAGE_SIZE,
    salonId: user?.salonId ? undefined : salonId,
    movementType: movementType || undefined,
  };
  const movements = useScopedQuery(['stock-movements', query], () => listStockMovements(query), {
    capability: 'inventory.read',
  });

  return (
    <div className="app-catalog-page space-y-5">
      {user?.role === 'MANAGER' ? <InventoryNavigation /> : null}
      <PageHeading
        title="Stock movements"
        description="Ledger of every stock change: purchases received, sales, adjustments and damage."
      />
      <ConsumptionReport salonId={user?.salonId ?? (salonId || undefined)} />
      <DataTable
        columns={COLUMNS}
        query={movements}
        rowKey={(m) => m.id}
        onPageChange={setPage}
        noun="movements"
        emptyTitle="No stock movements"
        emptyMessage="Stock changes will appear here once purchases are received or stock is adjusted."
        toolbar={
          <>
            <SalonPicker allowAll value={salonId} onChange={(id) => { setSalonId(id); setPage(1); }} className="w-48" />
            <SelectInput
              aria-label="Movement type"
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value as StockMovementType | '');
                setPage(1);
              }}
              className="w-44"
            >
              <option value="">All types</option>
              {(Object.keys(TYPE_LABEL) as StockMovementType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </SelectInput>
          </>
        }
      />
    </div>
  );
}
