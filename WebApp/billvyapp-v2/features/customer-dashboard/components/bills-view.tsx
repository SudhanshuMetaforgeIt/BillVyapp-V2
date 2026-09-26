'use client';

import { useState } from 'react';
import { FileText, Receipt, X } from 'lucide-react';

import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/features/payments/services/payments.service';
import { useMyBill, useMyBillDocuments, useMyBills } from '../hooks/use-customer-portal';
import { billStatusPill } from './customer-status';
import {
  CustomerCard,
  CustomerEmpty,
  CustomerError,
  CustomerLoading,
  CustomerPageTitle,
  CustomerPagination,
  CustomerPill,
} from './customer-ui';

const PAGE_SIZE = 10;

function BillDetail({ billId, onClose }: { billId: string; onClose: () => void }) {
  const bill = useMyBill(billId);
  const documents = useMyBillDocuments(billId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal aria-label="Bill details">
      <button type="button" className="flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-y-auto bg-[#FFFDF9] p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">Bill details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#7D766C] hover:bg-[#FAF7F2]" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        {bill.isLoading ? (
          <CustomerLoading />
        ) : bill.isError || !bill.data ? (
          <CustomerError error={bill.error} onRetry={() => void bill.refetch()} />
        ) : (
          <div className="space-y-4">
            <CustomerCard className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#1C1C1E]">{bill.data.billNumber}</p>
                <CustomerPill {...billStatusPill(bill.data.status, bill.data.paymentStatus)} />
              </div>
              <p className="text-xs text-[#7D766C]">
                {bill.data.salon?.name ?? 'Salon'} · {formatDate(bill.data.billDate)}
              </p>
            </CustomerCard>

            <CustomerCard>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8375]">Items</h3>
              <ul className="space-y-1.5 text-xs text-[#4A453E]">
                {bill.data.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>
                      {item.description ?? (item.itemType === 'SERVICE' ? 'Service' : 'Product')}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </span>
                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-[#F0EAE1] pt-3 text-xs">
                {[
                  ['Subtotal', bill.data.subtotal],
                  ['Discount', bill.data.discount],
                  ['Tax', bill.data.tax],
                  ['Round off', bill.data.roundOff],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-[#665E55]">
                    <dt>{label}</dt>
                    <dd>{formatCurrency(value)}</dd>
                  </div>
                ))}
                <div className="flex justify-between pt-1 text-sm font-extrabold text-[#1C1C1E]">
                  <dt>Total</dt>
                  <dd>{formatCurrency(bill.data.total)}</dd>
                </div>
                <div className="flex justify-between text-[#15803D]">
                  <dt>Paid</dt>
                  <dd>{formatCurrency(bill.data.paidAmount)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-[#B45309]">
                  <dt>Due</dt>
                  <dd>{formatCurrency(bill.data.dueAmount)}</dd>
                </div>
              </dl>
            </CustomerCard>

            <CustomerCard>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8375]">Payments</h3>
              {bill.data.payments.length === 0 ? (
                <p className="text-xs text-[#7D766C]">No payments recorded.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-[#4A453E]">
                  {bill.data.payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span>
                        {PAYMENT_METHOD_LABELS[p.paymentMethod]} · {formatDate(p.paymentDate)} · {PAYMENT_STATUS_LABELS[p.status]}
                      </span>
                      <span className="font-semibold">{formatCurrency(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {Number(bill.data.dueAmount) > 0 && bill.data.status === 'COMPLETED' ? (
                <p className="mt-3 text-[11px] text-[#8C8375]">Please settle the due amount at the salon.</p>
              ) : null}
            </CustomerCard>

            <CustomerCard>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8375]">Documents</h3>
              {documents.isLoading ? (
                <CustomerLoading />
              ) : documents.isError ? (
                <CustomerError error={documents.error} onRetry={() => void documents.refetch()} />
              ) : (documents.data?.data.length ?? 0) === 0 ? (
                <p className="text-xs text-[#7D766C]">No documents attached.</p>
              ) : (
                <>
                  <ul className="space-y-1.5 text-xs text-[#4A453E]">
                    {documents.data?.data.map((d) => (
                      <li key={d.id} className="flex items-center gap-2">
                        <FileText className="size-3.5 text-[#FF7B00]" />
                        <span className="truncate">{d.fileName}</span>
                        <span className="ml-auto shrink-0 text-[#8C8375]">{Math.ceil(d.fileSize / 1024)} KB</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-[#8C8375]">Ask the salon for a copy of these documents.</p>
                </>
              )}
            </CustomerCard>
          </div>
        )}
      </div>
    </div>
  );
}

export function BillsView() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useMyBills({ page, limit: PAGE_SIZE });
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-6 pb-16">
      <CustomerPageTitle title="My Bills" subtitle="Bills from your salon visits" />

      {query.isLoading ? (
        <CustomerLoading label="Loading bills…" />
      ) : query.isError && !query.data ? (
        <CustomerError error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <CustomerEmpty icon={<Receipt className="size-8" />} title="No bills yet" message="Bills appear here after your visits." />
      ) : (
        <>
          <ul className={cn('space-y-3', query.isFetching && 'opacity-70')}>
            {rows.map((bill) => (
              <li key={bill.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(bill.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EDE5D8] bg-white p-4 text-left transition-colors hover:border-[#FFB347]"
                >
                  <div>
                    <p className="text-sm font-bold text-[#1C1C1E]">{bill.billNumber}</p>
                    <p className="text-xs text-[#7D766C]">
                      {bill.salon?.name ?? 'Salon'} · {formatDate(bill.billDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CustomerPill {...billStatusPill(bill.status, bill.paymentStatus)} />
                    <span className="text-sm font-extrabold text-[#1C1C1E]">{formatCurrency(bill.total)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <CustomerPagination page={page} totalPages={query.data?.meta.totalPages ?? 1} onChange={setPage} disabled={query.isFetching} />
        </>
      )}

      {openId ? <BillDetail billId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
