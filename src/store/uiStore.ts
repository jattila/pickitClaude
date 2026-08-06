import { create } from 'zustand';

interface UiState {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  /**
   * Which shopping list the home screen is showing: 'personal', or a group id
   * once you share yours or join someone's. Deliberately not persisted to
   * Firestore — it is a "where am I looking right now" preference, and writing
   * it would cost a document write every time someone glances at the family
   * list. Falls back to personal whenever the stored scope is gone.
   */
  homeScopeKey: string;
  setHomeScopeKey: (key: string) => void;
}

/** Drives the global hamburger-menu overlay mounted once in the root layout. */
export const useUiStore = create<UiState>((set) => ({
  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  homeScopeKey: 'personal',
  setHomeScopeKey: (key) => set({ homeScopeKey: key }),
}));
