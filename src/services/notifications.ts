import { Platform } from 'react-native';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
  deleteToken,
} from '@react-native-firebase/messaging';
import { doc, setDoc, deleteDoc } from '@react-native-firebase/firestore';
import { firestore } from './firebase';

const ANDROID_CHANNEL_ID = 'pickit-digest';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Összefoglalók',
    importance: AndroidImportance.DEFAULT,
  });
}

async function saveToken(uid: string, token: string): Promise<void> {
  // Doc id is the token itself, so re-registering the same device is idempotent
  // and sendPush can delete a dead token by id without a lookup.
  await setDoc(
    doc(firestore, 'users', uid, 'devices', token),
    {
      token,
      platform: Platform.OS,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Asks for notification permission, registers this device's FCM token under the
 * user, and displays incoming pushes while the app is foregrounded (iOS and
 * Android both suppress those by default). Returns an unsubscribe function.
 *
 * Safe to call when permission is denied — it simply registers nothing.
 */
export async function registerForPushNotifications(uid: string): Promise<() => void> {
  const messaging = getMessaging();

  const settings = await notifee.requestPermission();
  if (settings.authorizationStatus === AuthorizationStatus.DENIED) return () => undefined;

  // iOS needs the APNs registration that this triggers before getToken() works.
  await requestPermission(messaging);
  await ensureAndroidChannel();

  const token = await getToken(messaging);
  if (token) await saveToken(uid, token);

  const unsubscribeRefresh = onTokenRefresh(messaging, (next) => {
    saveToken(uid, next).catch(() => undefined);
  });

  const unsubscribeForeground = onMessage(messaging, async (message) => {
    const { title, body } = message.notification ?? {};
    if (!title && !body) return;
    await notifee.displayNotification({
      title,
      body,
      android: { channelId: ANDROID_CHANNEL_ID },
    });
  });

  return () => {
    unsubscribeRefresh();
    unsubscribeForeground();
  };
}

/**
 * Drops this device's token on sign-out, so the next person to sign in on this
 * phone doesn't receive the previous user's digests.
 */
export async function unregisterCurrentDevice(uid: string): Promise<void> {
  const messaging = getMessaging();
  const token = await getToken(messaging).catch(() => null);
  if (!token) return;
  await deleteDoc(doc(firestore, 'users', uid, 'devices', token)).catch(() => undefined);
  await deleteToken(messaging).catch(() => undefined);
}
