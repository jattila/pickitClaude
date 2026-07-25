import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

/** Token errors that mean the device is gone for good, so the token should be dropped. */
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Sends one notification to every device registered for `uid`, pruning any
 * tokens FCM reports as dead so they don't accumulate forever.
 * Returns true if at least one device accepted it.
 */
export async function sendPushToUser(
  uid: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<boolean> {
  const db = getFirestore();
  const devicesSnap = await db.collection('users').doc(uid).collection('devices').get();
  const tokens = devicesSnap.docs.map((d) => d.id);
  if (tokens.length === 0) return false;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification,
    data,
    apns: { payload: { aps: { sound: 'default' } } },
    android: { priority: 'high' },
  });

  const deadTokens: string[] = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;
    const code = (result.error as { code?: string } | undefined)?.code;
    if (code && DEAD_TOKEN_CODES.has(code)) deadTokens.push(tokens[index]);
    else logger.warn('Push send failed', { uid, code });
  });

  if (deadTokens.length > 0) {
    const batch = db.batch();
    for (const token of deadTokens) {
      batch.delete(db.collection('users').doc(uid).collection('devices').doc(token));
    }
    await batch.commit();
  }

  return response.successCount > 0;
}
