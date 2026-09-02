import * as SQLite from 'expo-sqlite';
import * as Updates from 'expo-updates';
import { signOut } from '@react-native-firebase/auth';
import { clearPersistence, terminate } from '@react-native-firebase/firestore';
import { auth, firestore } from './firebase';
import { closeDb, GUEST_DB_NAME } from '../data/local/db';

/**
 * Puts this phone back to the state of a fresh install, without reinstalling.
 *
 * Development only. It exists because iOS offers no equivalent of Android's
 * "clear data": deleting collections and accounts in the Firebase console
 * leaves the device holding two stores that nothing on the server can reach —
 * Firestore's on-disk cache, and the guest SQLite database. Testing the
 * registration and migration paths means arriving at them from nothing, and
 * that was otherwise a delete-and-reinstall each time.
 *
 * Order matters. Firestore refuses to clear its cache while it is running, so
 * it has to be terminated first; and SQLite will not delete a file that is
 * still open. After this the app is deliberately in an unusable state — every
 * Firestore call would fail against a terminated instance — so it reloads, and
 * says so plainly if the reload is what fails.
 */
export async function resetDeviceState(): Promise<void> {
  if (!__DEV__) throw new Error('A visszaállítás csak fejlesztői változatban érhető el.');

  if (auth.currentUser) await signOut(auth).catch(() => undefined);

  await terminate(firestore).catch(() => undefined);
  await clearPersistence(firestore).catch(() => undefined);

  await closeDb();
  await SQLite.deleteDatabaseAsync(GUEST_DB_NAME).catch(() => undefined);

  await Updates.reloadAsync();
}
