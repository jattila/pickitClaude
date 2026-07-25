import { useEffect, useState } from 'react';
import { doc, onSnapshot, type DocumentData } from '@react-native-firebase/firestore';
import { firestore } from '../services/firebase';
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
    return onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
      const data = snap.data() as DocumentData | undefined;
      setSettings({ ...DEFAULT_SETTINGS, ...(data?.settings ?? {}) });
    });
  }, [user]);

  return settings;
}
