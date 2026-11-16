import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { auth } from '../services/firebase';
import { provisionVerifiedAccount } from '../services/provisioning';
import { takePendingInvite } from '../data/local/pendingInvite';
import { useAuthStore } from '../store/authStore';

/**
 * Reopens an invite that had to wait for an account, as soon as there is one.
 *
 * Runs whenever a verified account appears: right after confirming the email,
 * after signing in, or on a launch that restores a session.
 */
export function usePendingInviteResume() {
  const router = useRouter();
  const pathname = usePathname();
  // Read inside the async step, after the wait — by then the router may
  // already have opened the same invite itself from the link that started the
  // app, and a second copy of the screen would be pushed on top of it.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const uid = useAuthStore((state) => state.user?.uid);
  const emailVerified = useAuthStore((state) => state.emailVerified);

  useEffect(() => {
    if (!uid || !emailVerified) return;
    let cancelled = false;

    (async () => {
      // Joining copies the member's name and address from the profile, which a
      // brand-new account only has once provisioning has run. For an account
      // that already has one, this returns after a single read.
      const current = auth.currentUser;
      if (current) await provisionVerifiedAccount(current).catch(() => false);
      if (cancelled) return;

      const code = await takePendingInvite().catch(() => null);
      if (!code) return;
      const target = `/join/${code}`;
      if (pathnameRef.current === target) return;
      router.push(target);
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, emailVerified, router]);
}
