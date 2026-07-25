import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

/**
 * Sends the app back to the overview screen when a user signs out.
 *
 * Without this the user is left wherever they were — often a group screen or
 * a list they no longer have access to, which now just renders empty.
 *
 * Keyed on the *transition* from a signed-in uid to none, not on "uid is
 * falsy": at cold start the uid is briefly undefined while auth resolves, and
 * redirecting then would stomp on deep links (e.g. an invite opened from a
 * link) before they get a chance to render.
 */
export function useReturnHomeOnSignOut(): void {
  const router = useRouter();
  const uid = useAuthStore((state) => state.user?.uid);
  const previousUid = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousUid.current && !uid) router.replace('/');
    previousUid.current = uid;
  }, [uid, router]);
}
