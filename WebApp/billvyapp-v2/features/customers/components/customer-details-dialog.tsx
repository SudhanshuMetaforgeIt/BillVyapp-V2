'use client';

import { Calendar, Mail, MapPin, Phone, Receipt, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomerItem } from '../types/admin-customers.types';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

type CustomerDetailsDialogProps = {
  customer: CustomerItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function CustomerDetailsDialog({
  customer,
  isOpen,
  onClose,
}: CustomerDetailsDialogProps) {
  const router = useRouter();

  if (!isOpen || !customer) return null;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {customer.initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {customer.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span>{customer.customerCode}</span>
                <span>•</span>
                <span>{customer.joinedDate}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-2.5 rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 text-xs dark:border-stone-800 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Phone className="h-4 w-4 text-stone-400" />
            <span className="font-semibold">{customer.phone}</span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Mail className="h-4 w-4 text-stone-400" />
            <span>{customer.email}</span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <MapPin className="h-4 w-4 text-stone-400" />
            <span>Preferred Branch: <strong className="font-semibold">{customer.branchName}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <User className="h-4 w-4 text-stone-400" />
            <span>Gender: <strong className="capitalize">{customer.gender?.toLowerCase() || 'Unspecified'}</strong></span>
          </div>
        </div>

        {/* Billing metrics */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="text-[11px] text-stone-400 font-medium">Total Bills</div>
            <div className="mt-1 text-base font-bold text-stone-900 dark:text-white">
              {customer.totalBills}
            </div>
          </div>

          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="text-[11px] text-stone-400 font-medium">Total Spent</div>
            <div className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(customer.totalSpent)}
            </div>
          </div>

          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="text-[11px] text-stone-400 font-medium">Last Visit</div>
            <div className="mt-1 text-xs font-semibold text-stone-800 dark:text-stone-200">
              {customer.lastVisit}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              router.push(ROUTES.dashboard.admin.bills);
            }}
            className="flex items-center gap-1.5 h-9 text-xs"
          >
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            <span>Create Bill</span>
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
