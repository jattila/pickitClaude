import { doc, getDoc, type DocumentData } from '@react-native-firebase/firestore';
import type { User } from '@react-native-firebase/auth';
import { firestore } from './firebase';
import { createDefaultUserProfile } from './userProfile';
import { migrateGuestDataToCloud } from './migration';

/**
 * Creates the Firestore side of an account the first time its email is verified,
 * and brings any guest data on this phone up with it.
 *
 * Both wait for verification because the rules require a verified email for
 * every write — at registration time they would simply be denied. Registration
 * therefore only creates the Auth user, and this runs once the mailbox is
 * confirmed.
 *
 * The profile document's absence is the signal to run, which gives the two
 * properties this needs:
 *
 * - **Exactly once.** Any later sign-in — a second phone, a return visit after
 *   signing out — finds the profile and does nothing. That is what keeps a
 *   shared phone's guest list from being swept into whoever signs in next.
 * - **Retryable.** The profile is written *last*, so a migration interrupted
 *   halfway leaves no profile and is attempted again. Written first (as it used
 *   to be), a dropped connection would have stranded the local data forever
 *   while the app reported success.
 */

// The verification gate's button and the root hook can both fire at once, and
// this is not something to run twice concurrently.
let inFlight: Promise<boolean> | null = null;

/** Resolves true when guest data was actually moved up on this run. */
export function provisionVerifiedAccount(user: User): Promise<boolean> {
  if (!inFlight) {
    inFlight = run(user).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function run(user: User): Promise<boolean> {
  const profileRef = doc(firestore, 'users', user.uid);
  const existing = await getDoc(profileRef).catch(() => null);

  // A failed read is not the same as "no profile". Offline, or on a transient
  // error, carrying on would migrate and wipe local data against an account that
  // may already be set up — so leave everything alone and let a later run decide.
  if (!existing) return false;

  // The question is "has a profile been seeded", not "does a document exist".
  // Those came apart once already: the presence heartbeat wrote a single field
  // into users/{uid} the moment verification landed, creating a document that
  // this check read as a finished account — so the migration was skipped and the
  // guest's shopping list stayed stranded in SQLite. `createdAt` is written only
  // by createDefaultUserProfile, and only as part of the whole profile.
  const seeded = existing.exists() && (existing.data() as DocumentData)?.createdAt != null;
  if (seeded) return false;

  const result = await migrateGuestDataToCloud(user.uid);
  await createDefaultUserProfile(user.uid, user.email ?? '', user.displayName ?? undefined, result);
  return result.migrated;
}
