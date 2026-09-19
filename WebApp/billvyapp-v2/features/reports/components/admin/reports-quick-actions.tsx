'use client';

import { ChevronRight, FileText, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';

export function ReportsQuickActions() {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
        Quick Actions
      </h3>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => router.push(ROUTES.dashboard.admin.bills)}
          className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 p-2 text-xs font-semibold text-stone-800 hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-800 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-200"
        >
          <div className="flex items-center gap-1.5 truncate">
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">Sales Report</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => router.push(ROUTES.dashboard.admin.staff)}
          className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 p-2 text-xs font-semibold text-stone-800 hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-800 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-200"
        >
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">Staff Report</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => router.push(ROUTES.dashboard.admin.customers)}
          className="col-span-2 flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50/60 p-2 text-xs font-semibold text-stone-800 hover:border-amber-200 hover:bg-amber-50/50 hover:text-amber-800 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-200"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">Customer Report</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        </button>
      </div>
    </div>
  );
}
