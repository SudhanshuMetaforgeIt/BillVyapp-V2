'use client';

import {
  Briefcase,
  Calendar,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StaffItem } from '../types/staff.types';

type StaffDetailsDialogProps = {
  staff: StaffItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function StaffDetailsDialog({
  staff,
  isOpen,
  onClose,
}: StaffDetailsDialogProps) {
  if (!isOpen || !staff) return null;

  const formatSalary = (val: number) => {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-stone-700 dark:bg-amber-950/60 dark:text-amber-300">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {staff.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span>ID: {staff.staffCode}</span>
                <span>•</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {staff.roleName}
                </span>
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

        {/* Details breakdown */}
        <div className="mt-4 space-y-3 rounded-xl border border-stone-100 bg-stone-50/50 p-4 text-xs dark:border-stone-800 dark:bg-stone-800/40">
          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Phone className="h-4 w-4 text-stone-400" />
            <span className="font-semibold">{staff.phone}</span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Mail className="h-4 w-4 text-stone-400" />
            <span>{staff.email}</span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <MapPin className="h-4 w-4 text-stone-400" />
            <span>Assigned Branch: <strong className="font-semibold">{staff.branchName}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Briefcase className="h-4 w-4 text-stone-400" />
            <span>Role / Code: <strong className="font-semibold">{staff.roleName} ({staff.roleCode})</strong></span>
          </div>

          <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
            <Calendar className="h-4 w-4 text-stone-400" />
            <span>Joined: <strong className="font-semibold">{staff.joinDate}</strong></span>
          </div>
        </div>

        {/* Salary & Status Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="text-[11px] text-stone-400 font-medium">Monthly Salary</div>
            <div className="mt-1 text-base font-bold text-stone-900 dark:text-white">
              {formatSalary(staff.salary)}
            </div>
          </div>

          <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="text-[11px] text-stone-400 font-medium">Account Status</div>
            <div className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400 capitalize">
              {staff.status.toLowerCase().replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end border-t border-stone-100 pt-3 dark:border-stone-800">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 px-5 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
