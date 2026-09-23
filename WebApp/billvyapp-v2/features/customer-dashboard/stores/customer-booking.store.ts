import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CustomerBooking, Salon, ServiceCategoryKey, ServiceItem } from '../types';

interface CustomerBookingState {
  // Navigation & filter state
  searchQuery: string;
  selectedCategory: ServiceCategoryKey;
  selectedCity: string;
  favorites: string[]; // Salon IDs

  // Live collections
  salons: Salon[];
  services: ServiceItem[];

  // Active booking workflow
  selectedSalon: Salon | null;
  selectedServices: ServiceItem[];
  selectedDate: string; // YYYY-MM-DD
  selectedTimeSlot: string;
  promoCode: string;
  discountPercentage: number;
  customerNotes: string;

  // Bookings list
  bookings: CustomerBooking[];

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: ServiceCategoryKey) => void;
  setSelectedCity: (city: string) => void;
  setSalons: (salons: Salon[]) => void;
  setServices: (services: ServiceItem[]) => void;
  toggleFavorite: (salonId: string) => void;

  setSelectedSalon: (salon: Salon | null) => void;
  toggleService: (service: ServiceItem) => void;
  addService: (service: ServiceItem) => void;
  removeService: (serviceId: string) => void;
  clearServices: () => void;
  setSelectedDate: (date: string) => void;
  setSelectedTimeSlot: (slot: string) => void;
  setCustomerNotes: (notes: string) => void;
  applyPromoCode: (code: string) => boolean;
  removePromoCode: () => void;

  // Booking completion
  confirmBooking: (customerDetails?: { name?: string; phone?: string }) => CustomerBooking | null;
  cancelBooking: (bookingId: string) => void;
  resetBookingFlow: () => void;
}

export const useCustomerBookingStore = create<CustomerBookingState>()(
  persist(
    (set, get) => ({
      searchQuery: '',
      selectedCategory: 'all',
      selectedCity: 'Hyderabad, India',
      favorites: [],

      salons: [],
      services: [],

      selectedSalon: null,
      selectedServices: [],
      selectedDate: new Date().toISOString().split('T')[0],
      selectedTimeSlot: '11:00 AM',
      promoCode: '',
      discountPercentage: 0,
      customerNotes: '',

      bookings: [],

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setSelectedCity: (selectedCity) => set({ selectedCity }),
      setSalons: (salons) => set({ salons }),
      setServices: (services) => set({ services }),

      toggleFavorite: (salonId) =>
        set((state) => ({
          favorites: state.favorites.includes(salonId)
            ? state.favorites.filter((id) => id !== salonId)
            : [...state.favorites, salonId],
        })),

      setSelectedSalon: (selectedSalon) =>
        set((state) => {
          const isSameSalon = state.selectedSalon?.id === selectedSalon?.id;
          return {
            selectedSalon,
            selectedServices: isSameSalon ? state.selectedServices : [],
          };
        }),

      toggleService: (service) =>
        set((state) => {
          const exists = state.selectedServices.some((s) => s.id === service.id);
          if (exists) {
            return {
              selectedServices: state.selectedServices.filter((s) => s.id !== service.id),
            };
          }
          return {
            selectedServices: [...state.selectedServices, service],
          };
        }),

      addService: (service) =>
        set((state) => {
          if (state.selectedServices.some((s) => s.id === service.id)) return state;
          return { selectedServices: [...state.selectedServices, service] };
        }),

      removeService: (serviceId) =>
        set((state) => ({
          selectedServices: state.selectedServices.filter((s) => s.id !== serviceId),
        })),

      clearServices: () => set({ selectedServices: [] }),

      setSelectedDate: (selectedDate) => set({ selectedDate }),
      setSelectedTimeSlot: (selectedTimeSlot) => set({ selectedTimeSlot }),
      setCustomerNotes: (customerNotes) => set({ customerNotes }),

      applyPromoCode: (code) => {
        const cleaned = code.trim().toUpperCase();
        if (cleaned === 'WELCOME20') {
          set({ promoCode: 'WELCOME20', discountPercentage: 20 });
          return true;
        }
        if (cleaned === 'BILLVY10') {
          set({ promoCode: 'BILLVY10', discountPercentage: 10 });
          return true;
        }
        return false;
      },

      removePromoCode: () => set({ promoCode: '', discountPercentage: 0 }),

      confirmBooking: (customerDetails) => {
        const state = get();
        if (!state.selectedSalon || state.selectedServices.length === 0) {
          return null;
        }

        const subtotal = state.selectedServices.reduce((sum, s) => sum + s.price, 0);
        const totalDuration = state.selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
        const discount = Math.round((subtotal * state.discountPercentage) / 100);
        const totalAmount = Math.max(0, subtotal - discount);

        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const newBooking: CustomerBooking = {
          id: `bk-${Date.now()}`,
          bookingCode: `BV-BK-${randomSuffix}`,
          salon: state.selectedSalon,
          services: [...state.selectedServices],
          date: state.selectedDate || new Date().toISOString().split('T')[0],
          time: state.selectedTimeSlot || '11:00 AM',
          totalDuration,
          subtotal,
          discount,
          totalAmount,
          status: 'UPCOMING',
          createdAt: new Date().toISOString(),
          customerName: customerDetails?.name || 'Customer',
          customerPhone: customerDetails?.phone || '',
          notes: state.customerNotes,
        };

        set((s) => ({
          bookings: [newBooking, ...s.bookings],
          selectedServices: [],
          promoCode: '',
          discountPercentage: 0,
          customerNotes: '',
        }));

        return newBooking;
      },

      cancelBooking: (bookingId) =>
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'CANCELLED' } : b,
          ),
        })),

      resetBookingFlow: () =>
        set({
          selectedServices: [],
          promoCode: '',
          discountPercentage: 0,
          customerNotes: '',
        }),
    }),
    {
      name: 'billvy.customer-booking',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        bookings: state.bookings,
        selectedCity: state.selectedCity,
      }),
    },
  ),
);
