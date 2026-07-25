import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { sendPushToUser } from '../push/sendPush';
import { isUserPresent } from '../lib/presence';

const DEFAULT_INTERVAL_MINUTES = 60;
const USERS_PER_RUN = 200;

interface PendingEntry {
  listName: string;
  groupName: string;
  itemsAdded?: number;
  itemsChecked?: number;
}

/** "Juhász Család: 2 új tétel, 1 megvéve" */
function composeBody(entries: PendingEntry[]): string {
  const byGroup = new Map<string, { added: number; checked: number }>();
  for (const entry of entries) {
    const key = entry.groupName || 'Csoport';
    const totals = byGroup.get(key) ?? { added: 0, checked: 0 };
    totals.added += entry.itemsAdded ?? 0;
    totals.checked += entry.itemsChecked ?? 0;
    byGroup.set(key, totals);
  }

  return [...byGroup.entries()]
    .map(([groupName, totals]) => {
      const parts: string[] = [];
      if (totals.added > 0) parts.push(`${totals.added} új tétel`);
      if (totals.checked > 0) parts.push(`${totals.checked} megvéve`);
      return `${groupName}: ${parts.join(', ')}`;
    })
    .join('\n');
}

/**
 * Every 5 minutes, sends each due user a single summary of what changed in
 * their groups since the last one, then schedules their next digest.
 *
 * Users with digests disabled still get `nextDigestDueAt` rolled forward
 * (without a send) — leaving it in the past would keep them permanently in
 * this query's result set.
 */
export const digestScheduler = onSchedule(
  { schedule: 'every 5 minutes', region: 'europe-west1' },
  async () => {
    const db = getFirestore();
    const now = Date.now();

    const dueSnap = await db
      .collection('users')
      .where('nextDigestDueAt', '<=', now)
      .limit(USERS_PER_RUN)
      .get();

    for (const userDoc of dueSnap.docs) {
      const uid = userDoc.id;
      const settings = userDoc.data().settings ?? {};
      const intervalMinutes = settings.digestIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES;
      const nextDue = now + intervalMinutes * 60_000;

      try {
        const pendingRef = db.collection('users').doc(uid).collection('pendingDigest');
        const pendingSnap = await pendingRef.get();

        // Nothing to report, digests off, or the user is in the app right now
        // (they can see the changes, a push would just repeat them): roll the
        // clock forward without sending. Pending entries are cleared in all
        // three cases, so re-enabling — or closing the app — doesn't deliver a
        // pile of changes the user has already seen or opted out of.
        if (
          pendingSnap.empty ||
          settings.digestEnabled === false ||
          isUserPresent(userDoc.data(), now)
        ) {
          const batch = db.batch();
          pendingSnap.docs.forEach((d) => batch.delete(d.ref));
          batch.update(userDoc.ref, { nextDigestDueAt: nextDue });
          await batch.commit();
          continue;
        }

        const entries = pendingSnap.docs.map((d) => d.data() as PendingEntry);
        await sendPushToUser(
          uid,
          { title: 'PickIt — változások', body: composeBody(entries) },
          { type: 'digest' }
        );

        const batch = db.batch();
        pendingSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.update(userDoc.ref, { lastDigestSentAt: now, nextDigestDueAt: nextDue });
        await batch.commit();
      } catch (error) {
        // One user's failure must not stop the rest of the run. Their pending
        // entries stay put and roll into the next digest, but the clock still
        // moves — otherwise a permanently failing user would be retried on
        // every single run forever.
        logger.error('Digest failed for user', { uid, error });
        await userDoc.ref.update({ nextDigestDueAt: nextDue }).catch(() => undefined);
      }
    }
  }
);
