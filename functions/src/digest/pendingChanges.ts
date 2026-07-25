import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type PendingChangeKind = 'added' | 'checked';

/**
 * Records one change for every member of the list's group except whoever made
 * it, so `digestScheduler` can later summarize "what happened while you were
 * away" per user without scanning any lists.
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
  kind: PendingChangeKind
): Promise<void> {
  if (!list.groupId) return;

  const db = getFirestore();
  const groupSnap = await db.collection('groups').doc(list.groupId).get();
  if (!groupSnap.exists) return;

  const group = groupSnap.data()!;
  const recipients: string[] = (group.memberIds ?? []).filter((uid: string) => uid !== actorUid);
  if (recipients.length === 0) return;

  const now = Date.now();
  const counterField = kind === 'added' ? 'itemsAdded' : 'itemsChecked';

  const batch = db.batch();
  for (const uid of recipients) {
    batch.set(
      db.collection('users').doc(uid).collection('pendingDigest').doc(listId),
      {
        listId,
        listName: list.name ?? '',
        groupId: list.groupId,
        groupName: group.name ?? '',
        [counterField]: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );
  }
  await batch.commit();
}
