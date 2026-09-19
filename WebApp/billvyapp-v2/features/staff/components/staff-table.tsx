'use client';

import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  MoreVertical,
  Plus,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionEmptyState } from '@/components/layout/section-states';
import type { StaffItem, StaffStatus } from '../types/staff.types';

type StaffTableProps = {
  staff: StaffItem[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onAddStaff: () => void;
  onEditStaff: (member: StaffItem) => void;
  onViewStaff: (member: StaffItem) => void;
};

export function StaffTable({
  staff,
  total,
  currentPage,
  totalPages,
  limit,
  loading,
  onPageChange,
  onLimitChange,
  onAddStaff,
  onEditStaff,
  onViewStaff,
}: StaffTableProps) {
  const formatSalary = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getRoleBadge = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower.includes('senior') || lower.includes('admin') || lower.includes('owner')) {
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {roleName}
        </span>
      );
    }
    if (lower.includes('barber')) {
      return (
        <span className="inline-flex items-center rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          {roleName}
        </span>
      );
    }
    if (lower.includes('skin') || lower.includes('colour') || lower.includes('color')) {
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
          {roleName}
        </span>
      );
    }
    if (lower.includes('reception')) {
      return (
        <span className="inline-flex items-center rounded-md bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
          {roleName}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
        {roleName}
      </span>
    );
  };

  const getStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Active
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            On Leave
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Inactive
          </span>
        );
    }
  };

  const startRecord = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, total);

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white shadow-xs overflow-hidden dark:border-stone-800 dark:bg-stone-900">
      {staff.length === 0 && !loading ? (
        <div className="py-16 text-center">
          <SectionEmptyState
            title="No staff members found"
            message="No staff members match your filter criteria or none have been added yet."
          />
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              onClick={onAddStaff}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold h-9 px-4 rounded-lg shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Staff</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold text-stone-600 dark:border-stone-800 dark:bg-stone-800/50 dark:text-stone-400">
                  <th className="px-4 py-3.5">Staff Name</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Branch</th>
                  <th className="px-4 py-3.5">Mobile</th>
                  <th className="px-4 py-3.5 text-right">Salary (₹)</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Join Date</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                {staff.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-stone-50/70 dark:hover:bg-stone-800/40"
                  >
                    {/* Staff Name & ID */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onViewStaff(member)}
                            className="font-semibold text-stone-900 hover:text-amber-600 dark:text-white dark:hover:text-amber-400 text-left"
                          >
                            {member.name}
                          </button>
                          <div className="text-[11px] text-stone-400">
                            ID: {member.staffCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getRoleBadge(member.roleName)}
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 whitespace-nowrap">
                      {member.branchName}
                    </td>

                    {/* Mobile */}
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300 whitespace-nowrap">
                      {member.phone}
                    </td>

                    {/* Salary */}
                    <td className="px-4 py-3.5 text-right font-semibold text-stone-900 dark:text-white whitespace-nowrap">
                      {formatSalary(member.salary)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(member.status)}
                    </td>

                    {/* Join Date */}
                    <td className="px-4 py-3.5 text-center text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {member.joinDate}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditStaff(member)}
                          title="Edit Staff Member"
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewStaff(member)}
                          title="More options"
                          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-stone-200/80 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400">
            <div>
              Showing <span className="font-semibold text-stone-900 dark:text-white">{startRecord}</span> to{' '}
              <span className="font-semibold text-stone-900 dark:text-white">{endRecord}</span> of{' '}
              <span className="font-semibold text-stone-900 dark:text-white">{total.toLocaleString('en-IN')}</span> staff members
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

              {/* Page navigation */}
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
