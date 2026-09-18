'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import type { TopServiceByRevenueItem } from '../../types/admin-reports.types';

type TopServicesCardProps = {
  services: TopServiceByRevenueItem[];
};

export function TopServicesCard({ services }: TopServicesCardProps) {
  const router = useRouter();

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
          Top Services by Revenue
        </h3>

        <div className="mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 text-[11px] font-medium">
                <th className="pb-2 font-medium">Service</th>
                <th className="pb-2 text-right font-medium">Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 dark:divide-stone-800/60">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-stone-400">
                    No service revenue data yet.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 font-medium text-stone-800 dark:text-stone-200">
                      {s.name}
                    </td>
                    <td className="py-2.5 text-right font-bold text-stone-900 dark:text-white">
                      {formatINR(s.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(ROUTES.dashboard.admin.services)}
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 text-xs font-semibold h-8 rounded-lg"
        >
          View All Services
        </Button>
      </div>
    </div>
  );
}
