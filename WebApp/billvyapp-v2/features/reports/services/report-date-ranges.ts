import { businessToday } from '@/lib/business-calendar';
import { addCalendarDays } from '@/lib/business-timezone';
export const REPORT_PRESETS = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days',
  'This Month',
  'Last Month',
  'This Quarter',
  'This Year',
  'Custom Range',
] as const;
export function reportDateRange(preset: string, today = businessToday()) {
  const monthStart = `${today.slice(0, 7)}-01`;
  if (preset === 'Today') return { dateFrom: today, dateTo: today };
  if (preset === 'Yesterday') {
    const date = addCalendarDays(today, -1);
    return { dateFrom: date, dateTo: date };
  }
  if (preset === 'Last 7 Days' || preset === 'Last 30 Days')
    return {
      dateFrom: addCalendarDays(today, preset === 'Last 7 Days' ? -6 : -29),
      dateTo: today,
    };
  if (preset === 'Last Month') {
    const end = addCalendarDays(monthStart, -1);
    return { dateFrom: `${end.slice(0, 7)}-01`, dateTo: end };
  }
  if (preset === 'This Year')
    return { dateFrom: `${today.slice(0, 4)}-01-01`, dateTo: today };
  if (preset === 'This Quarter') {
    const month = Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1;
    return {
      dateFrom: `${today.slice(0, 4)}-${String(month).padStart(2, '0')}-01`,
      dateTo: today,
    };
  }
  return { dateFrom: monthStart, dateTo: today };
}
