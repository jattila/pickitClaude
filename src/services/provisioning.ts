import { doc, getDoc } from '@react-native-firebase/firestore';
import type { User } from '@react-native-firebase/auth';
import { firestore } from './firebase';
import { createDefaultUserProfile } from './userProfile';
import { migrateGuestDataToCloud } from './migration';

/**
 * Creates the Firestore side of an account, once, the first time the user is
 * verified.
 *
 * This used to run inline at registration, but the rules now require a
 * verified email for every write — so at that moment the profile write and the
 * guest-data migration would both be denied. Registration therefore only
 * creates the Auth user, and everything that touches Firestore waits here
 * until the mailbox is confirmed.
 *
 * Guarded on the profile document's absence rather than on a local flag, so it
 * stays correct across reinstalls and second devices: an existing account
 * signing in on a new phone finds its profile already there and does nothing —
 * in particular it does not migrate (and then wipe) whatever guest data that
 * phone happens to hold.
 */
export async function provisionVerifiedAccount(user: User): Promise<void> {
  const profileRef = doc(firestore, 'users', user.uid);
  const existing = await getDoc(profileRef).catch(() => null);
  if (existing?.exists()) return;

  await createDefaultUserProfile(user.uid, user.email ?? '', user.displayName ?? undefined);
  await migrateGuestDataToCloud(user.uid);
}
