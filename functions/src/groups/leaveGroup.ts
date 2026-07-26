import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * Removes the caller from a group.
 *
 * Runs server-side because the groups rule deliberately forbids clients from
 * touching memberIds at all — that's what keeps a member from adding themselves
 * to someone else's group.
 *
 * The owner can't leave: they'd strand the group with no one able to manage
 * members or delete it. Deleting the group is the owner's equivalent, and it
 * already exists.
 */
export const leaveGroup = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Be kell jelentkezni.');

  const { groupId } = request.data ?? {};
  if (typeof groupId !== 'string' || !groupId) {
    throw new HttpsError('invalid-argument', 'Hiányzik a groupId.');
  }

  const db = getFirestore();
  const groupRef = db.collection('groups').doc(groupId);

  await db.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport nem található.');

    const group = groupSnap.data()!;
    if (group.ownerId === uid) {
      throw new HttpsError(
        'failed-precondition',
        'A csoport tulajdonosa nem tud kilépni. Töröld a csoportot helyette.'
      );
    }
    if (!(group.memberIds ?? []).includes(uid)) {
      throw new HttpsError('failed-precondition', 'Nem vagy tagja ennek a csoportnak.');
    }

    tx.update(groupRef, { memberIds: FieldValue.arrayRemove(uid), updatedAt: Date.now() });
    tx.delete(groupRef.collection('members').doc(uid));
  });

  // Pending digest entries for this group would otherwise still be delivered,
  // notifying someone about a group they just left.
  const pending = await db
    .collection('users')
    .doc(uid)
    .collection('pendingDigest')
    .where('groupId', '==', groupId)
    .get()
    .catch(() => null);

  if (pending && !pending.empty) {
    const batch = db.batch();
    pending.docs.forEach((doc) => batch.delete(doc.ref));
    await batch
      .commit()
      .catch((error) => logger.error('Nem sikerült törölni a függő értesítéseket', { uid, error }));
  }

  return { left: true };
});
