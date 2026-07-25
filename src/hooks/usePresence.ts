import { useEffect } from 'react';
import { AppState } from 'react-native';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { firestore } from '../services/firebase';
import { useAuthStore } from '../store/authStore';

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

  useEffect(() => {
    if (!uid) return;
    const ref = doc(firestore, 'users', uid);

    const publish = (present: boolean) => {
      setDoc(ref, { activeUntil: present ? Date.now() + PRESENCE_WINDOW_MS : 0 }, { merge: true }).catch(
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
  }, [uid]);
}
