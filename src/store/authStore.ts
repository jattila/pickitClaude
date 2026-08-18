import { create } from 'zustand';
import { getIdToken, onAuthStateChanged, reload, type User } from '@react-native-firebase/auth';
import { auth } from '../services/firebase';

interface AuthState {
  user: User | null;
  /**
   * Tracked separately from `user` because `reload()` updates the user object
   * in place — the reference never changes, so anything selecting `user` would
   * not re-render when verification finally goes through.
   */
  emailVerified: boolean;
  initializing: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  emailVerified: false,
  initializing: true,
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({
    user,
    emailVerified: user?.emailVerified ?? false,
    initializing: false,
  });
});

/**
 * Re-checks with the server whether the user has clicked the verification link
 * by now, and publishes the result to the store.
 *
 * Both steps matter: `reload` refreshes the user record, and forcing a new ID
 * token refreshes the `email_verified` claim that the security rules and the
 * callables actually read — without it they would keep seeing the stale `false`
 * for up to an hour, and the app would look verified while every write failed.
 */
export async function refreshEmailVerified(): Promise<boolean> {
  const current = auth.currentUser;
  if (!current) return false;

  await reload(current);
  await getIdToken(current, true);

  // Read the user again rather than trusting `current`. Each access to
  // `auth.currentUser` hands back a fresh snapshot of the native state, so the
  // object captured before `reload` still says what it said then — which is why
  // the first "Megerősítettem" tap reported failure on an address that had just
  // been confirmed, and the second one worked without waiting for anything.
  const verified = auth.currentUser?.emailVerified ?? false;
  useAuthStore.setState({ emailVerified: verified });
  return verified;
}
