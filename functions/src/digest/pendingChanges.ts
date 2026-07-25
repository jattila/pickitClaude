import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { sendPushToUser } from '../push/sendPush';
import { isUserPresent } from '../lib/presence';

export type PendingChangeKind = 'added' | 'checked';

/**
 * At most one instant push per recipient per group in this window. Without it,
 * someone adding five items in a row would fire five notifications.
 */
const INSTANT_PUSH_COOLDOWN_MS = 2 * 60_000;

/**
 * Records one change for every member of the list's group except whoever made
 * it, so `digestScheduler` can later summarize "what happened while you were
 * away" per user without scanning any lists — and pushes immediately to those
 * who don't currently have the app open.
 *
 * The counters live under `users/{uid}/pendingDigest/{listId}` rather than
 * under the list: the scheduler works user-by-user, and this way each user's
 * pending set is a single small subcollection read instead of a collection-group
 * query across every list in the project.
 *
 * Personal (non-group) lists are skipped — there is nobody else to notify.
 */
export async function recordPendingChange(
  list: FirebaseFirestore.DocumentData,
  listId: string,
  actorUid: string | null | undefined,
  kind: PendingChangeKind,
  itemName?: string,
  actorName?: string | null
): Promise<void> {
  if (!list.groupId) return;

  const db = getFirestore();
  const groupSnap = await db.collection('groups').doc(list.groupId).get();
  if (!groupSnap.exists) return;

  const group = groupSnap.data()!;
  const recipients: string[] = (group.memberIds ?? []).filter((uid: string) => uid !== actorUid);
  if (recipients.length === 0) return;

  const now = Date.now();
  const groupName = group.name ?? '';
  const counterField = kind === 'added' ? 'itemsAdded' : 'itemsChecked';

  const batch = db.batch();
  for (const uid of recipients) {
    batch.set(
      db.collection('users').doc(uid).collection('pendingDigest').doc(listId),
      {
        listId,
        listName: list.name ?? '',
        groupId: list.groupId,
        groupName,
        [counterField]: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );
  }
  await batch.commit();

  await sendInstantPushes({ recipients, groupName, kind, itemName, actorName, now }).catch((error) =>
    // The pending counters are already committed, so the digest still covers
    // this change — a failed instant push must not fail the trigger.
    logger.error('Nem sikerült azonnali értesítést küldeni', { listId, error })
  );
}

async function sendInstantPushes(params: {
  recipients: string[];
  groupName: string;
  kind: PendingChangeKind;
  itemName?: string;
  actorName?: string | null;
  now: number;
}): Promise<void> {
  const { recipients, groupName, kind, itemName, actorName, now } = params;
  const db = getFirestore();

  const userSnaps = await db.getAll(...recipients.map((uid) => db.collection('users').doc(uid)));

  const body = itemName
    ? kind === 'added'
      ? `Új tétel: ${itemName}${actorName ? ` (${actorName})` : ''}`
      : `Megvéve: ${itemName}${actorName ? ` (${actorName})` : ''}`
    : 'Változás történt a listákon.';

  await Promise.all(
    userSnaps.map(async (userSnap) => {
      if (!userSnap.exists) return;
      const data = userSnap.data()!;
      const settings = data.settings ?? {};

      if (settings.instantPushEnabled === false) return;
      // Someone with the app open is watching the change land in real time.
      if (isUserPresent(data, now)) return;
      if (now - (data.lastInstantPushAt ?? 0) < INSTANT_PUSH_COOLDOWN_MS) return;

      const sent = await sendPushToUser(userSnap.id, { title: groupName || 'PickIt', body }, { type: 'instant' });
      // Only start the cooldown when something was actually delivered, so a
      // user with no registered device isn't muted for the next two minutes.
      if (sent) await userSnap.ref.update({ lastInstantPushAt: now });
    })
  );
}
