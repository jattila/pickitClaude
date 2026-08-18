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
  /**
   * Bumped when data moves underneath the app without a listener seeing it —
   * today only the guest-to-account migration. Hooks that resolve something
   * once (which list is "mine") depend on it, so they re-read instead of
   * showing the answer from before the move.
   */
  dataRevision: number;
  bumpDataRevision: () => void;
  /**
   * One-off things the home screen has to say about where the data went.
   *
   * They live here rather than on the screen because the event happens
   * elsewhere — a migration finishing in a root hook, a sign-in completing on
   * another route — and the home screen is simply where the person will be
   * looking when they land. Each is cleared as soon as it has been shown.
   */
  justMigratedNotice: boolean;
  setJustMigratedNotice: (value: boolean) => void;
  /** Signed in to an existing account while this phone still holds a guest list. */
  localListKeptNotice: boolean;
  setLocalListKeptNotice: (value: boolean) => void;
}

/** Drives the global hamburger-menu overlay mounted once in the root layout. */
export const useUiStore = create<UiState>((set) => ({
  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  homeScopeKey: 'personal',
  setHomeScopeKey: (key) => set({ homeScopeKey: key }),
  dataRevision: 0,
  bumpDataRevision: () => set((state) => ({ dataRevision: state.dataRevision + 1 })),
  justMigratedNotice: false,
  // Announcing a migration cancels the other message: signing in on a phone
  // whose account turns out to be brand new sets both, and "your phone list
  // stayed put" directly contradicts "your phone list moved to the cloud".
  setJustMigratedNotice: (value) =>
    set(value ? { justMigratedNotice: true, localListKeptNotice: false } : { justMigratedNotice: false }),
  localListKeptNotice: false,
  setLocalListKeptNotice: (value) => set({ localListKeptNotice: value }),
}));
