import type { BookingSlot, ServiceCategoryKey } from '../types';

export const CATEGORIES_CONFIG: {
  id: ServiceCategoryKey;
  label: string;
  emoji: string;
}[] = [
  { id: 'hair', label: 'Hair', emoji: '✂️' },
  { id: 'beauty', label: 'Beauty', emoji: '🪷' },
  { id: 'grooming', label: 'Grooming', emoji: '🧔' },
  { id: 'nails', label: 'Nails', emoji: '💅' },
  { id: 'spa', label: 'Spa', emoji: '🌸' },
  { id: 'products', label: 'Products', emoji: '🛍️' },
];

export const STANDARD_TIME_SLOTS: BookingSlot[] = [
  { time: '09:00 AM', period: 'morning', available: true },
  { time: '10:00 AM', period: 'morning', available: true },
  { time: '11:00 AM', period: 'morning', available: true },
  { time: '12:00 PM', period: 'afternoon', available: true },
  { time: '01:00 PM', period: 'afternoon', available: true },
  { time: '02:00 PM', period: 'afternoon', available: true },
  { time: '03:00 PM', period: 'afternoon', available: true },
  { time: '04:00 PM', period: 'afternoon', available: true },
  { time: '05:00 PM', period: 'evening', available: true },
  { time: '06:00 PM', period: 'evening', available: true },
  { time: '07:00 PM', period: 'evening', available: true },
  { time: '08:00 PM', period: 'evening', available: true },
];
