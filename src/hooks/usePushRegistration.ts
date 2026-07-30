import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications } from '../services/notifications';

/**
 * Registers this device for push whenever a user is signed in, and tears the
 * listeners down on sign-out. Mounted once from the root layout.
 */
export function usePushRegistration(): void {
  const uid = useAuthStore((state) => state.user?.uid);
  // Registering writes the token to Firestore, which an unverified account is
  // not allowed to do — waiting avoids a guaranteed permission failure.
  const emailVerified = useAuthStore((state) => state.emailVerified);

  useEffect(() => {
    if (!uid || !emailVerified) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    registerForPushNotifications(uid)
      .then((cleanup) => {
        if (cancelled) cleanup();
        else unsubscribe = cleanup;
      })
      // Permission refusal or a missing APNs setup shouldn't break the app —
      // push is an enhancement, everything else keeps working without it.
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [uid, emailVerified]);
}
