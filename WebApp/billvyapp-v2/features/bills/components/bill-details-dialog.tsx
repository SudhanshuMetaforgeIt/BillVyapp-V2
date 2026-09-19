'use client';

import { CheckCircle2, Clock, FileText, Printer, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BillRowItem } from '../types/bills.types';

type BillDetailsDialogProps = {
  bill: BillRowItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function BillDetailsDialog({
  bill,
  isOpen,
  onClose,
}: BillDetailsDialogProps) {
  if (!isOpen || !bill) return null;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {bill.billNumber}
              </h2>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {bill.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Raised on {bill.billDate} at {bill.billTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customer & Branch details */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 text-xs dark:border-stone-800 dark:bg-stone-800/40">
          <div>
            <span className="block text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
              Customer
            </span>
            <span className="font-bold text-stone-900 dark:text-white">
              {bill.customerName}
            </span>
            <span className="block text-stone-500 dark:text-stone-400">
              {bill.customerPhone}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
              Branch Location
            </span>
            <span className="font-bold text-stone-900 dark:text-white">
              {bill.branchName}
            </span>
            <span className="block text-stone-500 dark:text-stone-400">
              Payment Status: <span className="font-semibold text-amber-600">{bill.paymentStatus}</span>
            </span>
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-4">
          <h4 className="text-xs font-bold text-stone-900 dark:text-white mb-2">
            Billed Items ({bill.items.length})
          </h4>
          <div className="overflow-x-auto rounded-lg border border-stone-200/80 dark:border-stone-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200/80 bg-stone-50 text-[11px] font-semibold text-stone-600 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-400">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {bill.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-stone-400">
                      Standard Service Package
                    </td>
                  </tr>
                ) : (
                  bill.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="px-3 py-2 font-medium text-stone-800 dark:text-stone-200">
                        {it.description || `Service #${idx + 1}`}
                      </td>
                      <td className="px-3 py-2 text-center text-stone-600 dark:text-stone-400">
                        {it.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-stone-600 dark:text-stone-400">
                        {formatINR(it.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-stone-900 dark:text-white">
                        {formatINR(it.total || it.quantity * it.unitPrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Breakdown */}
        <div className="mt-4 space-y-1.5 rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 text-xs dark:border-stone-800 dark:bg-stone-800/40">
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Subtotal:</span>
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {formatINR(bill.amount)}
            </span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Paid Amount:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(bill.paidAmount)}
            </span>
          </div>
          <div className="flex justify-between text-stone-600 dark:text-stone-400">
            <span>Due Amount:</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {formatINR(bill.dueAmount)}
            </span>
          </div>
          <div className="border-t border-stone-200/80 pt-2 flex justify-between text-sm font-bold text-stone-900 dark:text-white">
            <span>Total Bill Amount:</span>
            <span className="text-amber-600 dark:text-amber-400">
              {formatINR(bill.amount)}
            </span>
          </div>
        </div>

        {bill.notes && (
          <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Notes:</span>{' '}
            {bill.notes}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 text-xs"
          >
            <Printer className="h-3.5 w-3.5 text-stone-600" />
            <span>Print Invoice</span>
          </Button>

          <Button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
