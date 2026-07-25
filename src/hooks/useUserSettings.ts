import { useCallback, useEffect, useState } from 'react';
import { doc, setDoc, type DocumentData } from '@react-native-firebase/firestore';
import { firestore } from '../services/firebase';
import { watchDoc } from '../services/firestoreWatch';
import { useAuthStore } from '../store/authStore';
import { DEFAULT_SETTINGS } from '../services/userProfile';

export type UserSettings = typeof DEFAULT_SETTINGS;

/** Guests (and users whose profile doc lacks a field) fall back to DEFAULT_SETTINGS. */
export function useUserSettings(): UserSettings {
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    return watchDoc(
      doc(firestore, 'users', user.uid),
      (snap) => {
        const data = snap.data() as DocumentData | undefined;
        return { ...DEFAULT_SETTINGS, ...(data?.settings ?? {}) };
      },
      setSettings,
      DEFAULT_SETTINGS
    );
  }, [user]);

  return settings;
}

/**
 * Read + write access for the settings screen. The write is a merge, so
 * changing one field never drops the others, and the onSnapshot above
 * reflects it back — no local optimistic state needed.
 */
export function useEditableUserSettings() {
  const user = useAuthStore((state) => state.user);
  const settings = useUserSettings();

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user) return;
      await setDoc(doc(firestore, 'users', user.uid), { settings: patch }, { merge: true });
    },
    [user]
  );

  return { settings, updateSettings };
}
