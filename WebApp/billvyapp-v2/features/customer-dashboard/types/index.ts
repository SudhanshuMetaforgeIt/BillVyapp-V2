export type ServiceCategoryKey =
  | 'all'
  | 'hair'
  | 'beauty'
  | 'grooming'
  | 'nails'
  | 'spa'
  | 'products';

export interface ServiceItem {
  id: string;
  salonId: string;
  name: string;
  category: ServiceCategoryKey;
  durationMinutes: number;
  price: number;
  description: string;
  image?: string;
  popular?: boolean;
}

export interface Salon {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  area: string;
  city: string;
  fullAddress: string;
  image: string;
  gallery?: string[];
  categories: ServiceCategoryKey[];
  tags: string[];
  about: string;
  phone: string;
  openingHours: string;
  isPopular?: boolean;
}

export interface BookingSlot {
  time: string;
  period: 'morning' | 'afternoon' | 'evening';
  available: boolean;
}

export interface CustomerBooking {
  id: string;
  bookingCode: string;
  salon: Salon;
  services: ServiceItem[];
  date: string;
  time: string;
  totalDuration: number;
  subtotal: number;
  discount: number;
  totalAmount: number;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
}
