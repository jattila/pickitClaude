import { signOut } from '@react-native-firebase/auth';
import { auth } from './firebase';
import { unregisterCurrentDevice } from './notifications';

/**
 * Signs out, dropping this device's push token first so the next person to
 * sign in on this phone doesn't receive the previous user's digests.
 * Sign-out proceeds even if unregistering fails — being unable to clean up a
 * token must never trap someone in a session.
 */
export async function signOutFully(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) await unregisterCurrentDevice(uid).catch(() => undefined);
  await signOut(auth);
}
