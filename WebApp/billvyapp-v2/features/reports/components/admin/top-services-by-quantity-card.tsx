'use client';

import { Flame, Scissors, Sparkles, Wand2 } from 'lucide-react';
import type { TopServiceByQuantityItem } from '../../types/admin-reports.types';

type TopServicesByQuantityCardProps = {
  items: TopServiceByQuantityItem[];
};

export function TopServicesByQuantityCard({
  items,
}: TopServicesByQuantityCardProps) {
  const getIcon = (name: string) => {
    const l = name.toLowerCase();
    if (l.includes('hair cut') || l.includes('beard') || l.includes('trim')) {
      return <Scissors className="h-3.5 w-3.5 text-rose-500" />;
    }
    if (l.includes('spa') || l.includes('facial') || l.includes('massage')) {
      return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
    }
    if (l.includes('color') || l.includes('colour')) {
      return <Flame className="h-3.5 w-3.5 text-orange-500" />;
    }
    return <Wand2 className="h-3.5 w-3.5 text-sky-500" />;
  };

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
        Top Services by Quantity
      </h3>

      <div className="mt-4 space-y-3 text-xs">
        {items.length === 0 ? (
          <div className="py-6 text-center text-stone-400">
            No service usage data yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                {getIcon(item.name)}
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-stone-900 dark:text-white">
                {item.quantity.toLocaleString('en-IN')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
