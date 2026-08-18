import { useEffect } from 'react';
import { auth } from '../services/firebase';
import { provisionVerifiedAccount } from '../services/provisioning';
import { markAccountUsedHere } from '../data/local/accountHistory';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Makes sure a signed-in account has its Firestore side, and that nothing is
 * left behind on the phone.
 *
 * Mounted once at the root so it covers every way in — a fresh registration, a
 * returning sign-in, or an app launch that restores a session. Signing in is
 * the moment the app stops reading local storage and starts reading Firestore,
 * so it is also the moment anything still local has to move, or it goes dark.
 *
 * Waits for a connection: the whole job is writes, and there is nothing to gain
 * from starting it offline. It runs again when the connection returns.
 */
export function useAccountProvisioning() {
  const user = useAuthStore((state) => state.user);
  const emailVerified = useAuthStore((state) => state.emailVerified);
  const { isConnected } = useNetworkStatus();
  const bumpDataRevision = useUiStore((state) => state.bumpDataRevision);
  const setJustMigratedNotice = useUiStore((state) => state.setJustMigratedNotice);

  useEffect(() => {
    if (!user || !emailVerified || !isConnected) return;
    const current = auth.currentUser;
    if (!current) return;

    let cancelled = false;

    // Remembered on the phone, and it outlives signing out. Without it a guest
    // who registered here once and later signed out would be offered
    // registration again — sending them to make a second account while their
    // list sits in the cloud under the first one.
    markAccountUsedHere().catch(() => undefined);

    provisionVerifiedAccount(current)
      .then((migrated) => {
        if (cancelled) return;
        // Tells the screens that resolve "my list" once to look again — after a
        // migration the answer has changed, and nothing else would tell them.
        bumpDataRevision();
        // Moving somebody's shopping list into the cloud without a word is the
        // kind of silence that reads as loss when they later sign out.
        if (migrated) setJustMigratedNotice(true);
      })
      // Left to the next run rather than surfaced: the local tables are only
      // cleared after everything is safely up, so a failure here loses nothing
      // and simply retries on the next launch or reconnect.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user?.uid, emailVerified, isConnected, bumpDataRevision, setJustMigratedNotice]);
}
