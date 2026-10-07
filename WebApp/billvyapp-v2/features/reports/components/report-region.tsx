'use client';
import { createContext, useContext } from 'react';
import { formatCurrency } from '@/lib/format';
const Currency = createContext<string | undefined>(undefined);
export const ReportCurrency = Currency.Provider;
export function useReportMoney() {
  const currency = useContext(Currency);
  return (value: number | string | null | undefined) =>
    formatCurrency(value, currency);
}
