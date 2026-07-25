import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Keeps `nextDigestDueAt` in step with the user's chosen interval. Without
 * this, shortening the interval wouldn't take effect until the already-
 * scheduled (longer) wait elapsed.
 */
export const onUserSettingsUpdated = onDocumentUpdated('users/{uid}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const beforeInterval = before.settings?.digestIntervalMinutes;
  const afterInterval = after.settings?.digestIntervalMinutes;
  if (beforeInterval === afterInterval || typeof afterInterval !== 'number') return;

  const base = after.lastDigestSentAt ?? Date.now();
  const nextDue = base + afterInterval * 60_000;

  // Writing to the same doc that triggered us re-fires this function; the
  // interval is unchanged on that second pass, so it exits at the guard above.
  await getFirestore().collection('users').doc(event.params.uid).update({ nextDigestDueAt: nextDue });
});
