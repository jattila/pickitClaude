import { useEffect } from 'react';
import { AppState } from 'react-native';
import { doc, updateDoc } from '@react-native-firebase/firestore';
import { firestore } from '../services/firebase';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

/** How far ahead each heartbeat claims the user is present. */
const PRESENCE_WINDOW_MS = 3 * 60_000;
/** Comfortably shorter than the window, so presence never lapses mid-session. */
const HEARTBEAT_MS = 2 * 60_000;

/**
 * Publishes whether this user currently has the app open, as an expiry
 * timestamp on their own document. The server uses it to avoid notifying
 * someone about changes they are watching happen on screen.
 *
 * An expiry (rather than a "last seen" stamp) makes going away explicit: on
 * backgrounding we clear it outright, instead of writing a timestamp that
 * would keep looking recent — and therefore active — for minutes afterwards.
 */
export function usePresence(): void {
  const uid = useAuthStore((state) => state.user?.uid);
  // The heartbeat is a Firestore write, which an unverified account can't make.
  const emailVerified = useAuthStore((state) => state.emailVerified);
  // Bumped when the account is provisioned. Presence fires the instant an email
  // is verified, which is *before* the profile document exists, so the first
  // heartbeat has nothing to write to — this brings it back once there is.
  const dataRevision = useUiStore((state) => state.dataRevision);

  useEffect(() => {
    if (!uid || !emailVerified) return;
    const ref = doc(firestore, 'users', uid);

    // updateDoc, not setDoc with merge: a merge would *create* the profile
    // document holding nothing but this heartbeat. Account setup treats an
    // existing document as an account that has already been through
    // provisioning, so that phantom made it skip migrating the phone's guest
    // list — and the list silently vanished. Failing until the profile exists is
    // the correct behaviour here; presence is best-effort by nature.
    const publish = (present: boolean) => {
      updateDoc(ref, { activeUntil: present ? Date.now() + PRESENCE_WINDOW_MS : 0 }).catch(
        () => undefined
      );
    };

    publish(AppState.currentState === 'active');
    const heartbeat = setInterval(() => {
      if (AppState.currentState === 'active') publish(true);
    }, HEARTBEAT_MS);

    const subscription = AppState.addEventListener('change', (state) => publish(state === 'active'));

    return () => {
      clearInterval(heartbeat);
      subscription.remove();
      publish(false);
    };
  }, [uid, emailVerified, dataRevision]);
}
