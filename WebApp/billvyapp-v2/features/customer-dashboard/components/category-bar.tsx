'use client';

import { CATEGORIES_CONFIG } from '../data/constants';
import { useCustomerBookingStore } from '../stores/customer-booking.store';
import type { ServiceCategoryKey } from '../types';
import { cn } from '@/lib/utils';

export function CategoryBar() {
  const selectedCategory = useCustomerBookingStore((s) => s.selectedCategory);
  const setSelectedCategory = useCustomerBookingStore((s) => s.setSelectedCategory);

  const handleCategoryClick = (catId: ServiceCategoryKey) => {
    if (selectedCategory === catId) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(catId);
    }
  };

  return (
    <section className="py-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
        {CATEGORIES_CONFIG.map((cat) => {
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                'group flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 sm:p-5 transition-all duration-200 active:scale-95',
                isSelected
                  ? 'border-[#FF7B00] bg-[#FFF8EE] shadow-sm shadow-[#FF7B00]/15'
                  : 'border-[#EDE5D8] bg-white hover:border-[#FFD099] hover:bg-[#FFFCF7] shadow-2xs',
              )}
            >
              {/* Category Icon */}
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-transform duration-200 group-hover:scale-110',
                  isSelected ? 'bg-[#FFE9CC]' : 'bg-[#FAF5ED] group-hover:bg-[#FFF2E0]',
                )}
              >
                <span>{cat.emoji}</span>
              </div>

              {/* Category Label */}
              <span
                className={cn(
                  'text-xs sm:text-sm font-semibold tracking-tight',
                  isSelected
                    ? 'text-[#FF7B00]'
                    : 'text-[#3D3830] group-hover:text-[#1C1C1E]',
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
