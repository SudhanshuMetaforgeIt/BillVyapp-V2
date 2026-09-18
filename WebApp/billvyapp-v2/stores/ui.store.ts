import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Global client-side UI state only.
 *
 * The active franchise/salon live here because they are a user choice that
 * scopes many screens at once. The franchise and salon *records* themselves
 * are server data and belong in TanStack Query.
 */
interface UiState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  activeFranchiseId: string | null;
  activeSalonId: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  setActiveFranchise: (franchiseId: string | null) => void;
  setActiveSalon: (salonId: string | null) => void;
  resetScope: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,

      activeFranchiseId: null,
      activeSalonId: null,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebarCollapsed: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setActiveFranchise: (activeFranchiseId) =>
        // Changing franchise invalidates any salon chosen underneath it.
        set({ activeFranchiseId, activeSalonId: null }),

      setActiveSalon: (activeSalonId) => set({ activeSalonId }),

      resetScope: () => set({ activeFranchiseId: null, activeSalonId: null }),
    }),
    {
      name: 'billvy.ui',
      storage: createJSONStorage(() => localStorage),
      // Transient open/closed state should not survive a reload.
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeFranchiseId: state.activeFranchiseId,
        activeSalonId: state.activeSalonId,
      }),
    },
  ),
);
