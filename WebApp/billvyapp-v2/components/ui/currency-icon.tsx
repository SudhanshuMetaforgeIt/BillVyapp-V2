'use client';

import { forwardRef } from 'react';
import { DollarSign, IndianRupee, type LucideProps } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

/** The current business currency, matching the shared money formatter. */
export const CurrencyIcon = forwardRef<SVGSVGElement, LucideProps & { currency?: string }>(({ currency, ...props }, ref) => {
  const businessCurrency = useAuthStore((state) => state.user?.currency);
  const Icon = (currency ?? businessCurrency) === 'USD' ? DollarSign : IndianRupee;
  return <Icon {...props} ref={ref} />;
});
CurrencyIcon.displayName = 'CurrencyIcon';
