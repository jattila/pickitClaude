import { doc, setDoc } from '@react-native-firebase/firestore';
import { firestore } from './firebase';

export const DEFAULT_SETTINGS = {
  recentPurchaseWindowMinutes: 30,
  digestIntervalMinutes: 60,
  digestEnabled: true,
  recentPurchaseWarningEnabled: true,
  /** Immediate push for group changes, sent only while the app isn't open. */
  instantPushEnabled: true,
};

/** Seeds the users/{uid} profile doc right after registration. */
export async function createDefaultUserProfile(uid: string, email: string, displayName?: string): Promise<void> {
  const now = Date.now();
  await setDoc(doc(firestore, 'users', uid), {
    email,
    displayName: displayName?.trim() || email.split('@')[0],
    settings: DEFAULT_SETTINGS,
    lastDigestSentAt: now,
    nextDigestDueAt: now + DEFAULT_SETTINGS.digestIntervalMinutes * 60_000,
    createdAt: now,
  });
}
