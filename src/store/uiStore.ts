import { create } from 'zustand';

interface UiState {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

/** Drives the global hamburger-menu overlay mounted once in the root layout. */
export const useUiStore = create<UiState>((set) => ({
  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
}));
