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

/**
 * Seeds the users/{uid} profile doc, once the email is verified.
 *
 * Written *after* any guest data has been moved up, and in one go: the profile's
 * existence is what tells the app the account is already set up, so a partial
 * write here would make an unfinished migration look finished.
 *
 * `defaultListId` carries over the guest's quick-add list so it stays the one
 * the home screen writes into; `guestDataMigratedAt` records that the one-time
 * move happened, for anyone reading the data later.
 */
export async function createDefaultUserProfile(
  uid: string,
  email: string,
  displayName?: string,
  guestData?: { defaultListId: string | null; migrated: boolean }
): Promise<void> {
  const now = Date.now();
  await setDoc(doc(firestore, 'users', uid), {
    email,
    displayName: displayName?.trim() || email.split('@')[0],
    settings: DEFAULT_SETTINGS,
    lastDigestSentAt: now,
    nextDigestDueAt: now + DEFAULT_SETTINGS.digestIntervalMinutes * 60_000,
    defaultListId: guestData?.defaultListId ?? null,
    guestDataMigratedAt: guestData?.migrated ? now : null,
    createdAt: now,
  });
}
