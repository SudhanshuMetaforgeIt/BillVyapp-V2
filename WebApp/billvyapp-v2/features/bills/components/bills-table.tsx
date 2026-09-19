'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  MoreVertical,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import type { BillRowItem, BillStatus } from '../types/bills.types';

type BillsTableProps = {
  bills: BillRowItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onCreateBill: () => void;
  onViewBill: (bill: BillRowItem) => void;
  onUpdateStatus?: (billId: string, status: BillStatus) => void;
};

export function BillsTable({
  bills,
  total,
  currentPage,
  totalPages,
  limit,
  loading,
  onPageChange,
  onLimitChange,
  onCreateBill,
  onViewBill,
}: BillsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(bills.map((b) => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const isAllSelected =
    bills.length > 0 && selectedIds.size === bills.length;

  const startRecord = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, total);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Completed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Pending
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Overdue
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            Cancelled
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            Draft
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Paid
          </span>
        );
      case 'PARTIAL':
      case 'PENDING':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Pending
          </span>
        );
      case 'UNPAID':
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Unpaid
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900">
      {bills.length === 0 && !loading ? (
        <div className="py-16 text-center">
          <SectionEmptyState
            title="No bills found"
            message="No bills match your current filters or no bills have been raised yet."
          />
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              onClick={onCreateBill}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold h-9 px-4 rounded-lg shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Bill</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold text-stone-600 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-400">
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                  </th>
                  <th className="px-4 py-3.5">Bill No.</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Branch</th>
                  <th className="px-4 py-3.5">Bill Date</th>
                  <th className="px-4 py-3.5 text-right">Amount (₹)</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Payment Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {bills.map((bill) => {
                  const isChecked = selectedIds.has(bill.id);
                  return (
                    <tr
                      key={bill.id}
                      className={`transition-colors hover:bg-stone-50/70 dark:hover:bg-stone-800/40 ${
                        isChecked ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(bill.id)}
                          className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>

                      {/* Bill No */}
                      <td className="px-4 py-3.5 font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewBill(bill)}
                          className="hover:underline"
                        >
                          {bill.billNumber}
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-stone-900 dark:text-white">
                          {bill.customerName}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          {bill.customerPhone}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 whitespace-nowrap">
                        {bill.branchName}
                      </td>

                      {/* Bill Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-stone-800 dark:text-stone-200">
                          {bill.billDate}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {bill.billTime}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right font-semibold text-stone-900 dark:text-white whitespace-nowrap">
                        {bill.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(bill.status)}
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {getPaymentStatusBadge(bill.paymentStatus)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewBill(bill)}
                            title="View Details"
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewBill(bill)}
                            title="Receipt"
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewBill(bill)}
                            title="More options"
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Showing X to Y and Pagination */}
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-stone-200/80 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
            <div>
              Showing <span className="font-semibold text-stone-900 dark:text-white">{startRecord}</span> to{' '}
              <span className="font-semibold text-stone-900 dark:text-white">{endRecord}</span> of{' '}
              <span className="font-semibold text-stone-900 dark:text-white">{total.toLocaleString('en-IN')}</span> bills
            </div>

            <div className="flex items-center gap-3">
              {/* Page size dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 shadow-2xs focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  const isCurrent = p === currentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPageChange(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-amber-500 text-white'
                          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span className="px-1 text-stone-400">...</span>
                    <button
                      type="button"
                      onClick={() => onPageChange(totalPages)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
