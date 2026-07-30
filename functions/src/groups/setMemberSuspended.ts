import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireVerifiedUid } from '../lib/requireVerified';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * Owner-only suspend / reinstate for a group member.
 *
 * Suspension works by pulling the uid out of `groups/{groupId}.memberIds`
 * while keeping the member document (flagged `suspended`). Every existing
 * security rule gates on memberIds, so this locks the member out of the
 * group's lists, items and catalog immediately — no rule changes and no extra
 * document reads per request. Reinstating puts the uid back.
 *
 * It has to run server-side: the groups update rule deliberately forbids the
 * client from touching memberIds at all.
 */
export const setMemberSuspended = onCall(async (request) => {
  const callerUid = requireVerifiedUid(request);

  const { groupId, uid, suspended } = request.data ?? {};
  if (typeof groupId !== 'string' || !groupId) {
    throw new HttpsError('invalid-argument', 'Hiányzik a groupId.');
  }
  if (typeof uid !== 'string' || !uid) {
    throw new HttpsError('invalid-argument', 'Hiányzik a tag azonosítója.');
  }
  if (typeof suspended !== 'boolean') {
    throw new HttpsError('invalid-argument', 'A suspended mező logikai érték kell legyen.');
  }
  if (uid === callerUid) {
    throw new HttpsError('failed-precondition', 'Magadat nem függesztheted fel.');
  }

  const db = getFirestore();
  const groupRef = db.collection('groups').doc(groupId);
  const memberRef = groupRef.collection('members').doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const [groupSnap, memberSnap, ownerSnap] = await Promise.all([
      tx.get(groupRef),
      tx.get(memberRef),
      tx.get(db.collection('users').doc(callerUid)),
    ]);

    if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport nem található.');
    const group = groupSnap.data()!;
    if (group.ownerId !== callerUid) {
      throw new HttpsError('permission-denied', 'Csak a csoport tulajdonosa függeszthet fel tagot.');
    }
    if (!memberSnap.exists) throw new HttpsError('not-found', 'Ez a tag nem található a csoportban.');
    const member = memberSnap.data()!;

    tx.update(groupRef, {
      memberIds: suspended ? FieldValue.arrayRemove(uid) : FieldValue.arrayUnion(uid),
      updatedAt: Date.now(),
    });
    tx.set(
      memberRef,
      {
        suspended,
        suspendedAt: suspended ? Date.now() : null,
        suspendedBy: suspended ? callerUid : null,
      },
      { merge: true }
    );

    return {
      groupName: group.name ?? '',
      ownerEmail: ownerSnap.exists ? ownerSnap.data()!.email ?? null : null,
      ownerName: ownerSnap.exists ? ownerSnap.data()!.displayName ?? '' : '',
    };
  });

  // The notice goes under the member's *own* user document, not the group:
  // a suspended member is out of memberIds, so every group path is closed to
  // them and they could never read the owner's address from there. This is the
  // one place they can still read.
  //
  // Written outside the transaction and non-fatal on purpose — failing to
  // record a notice must not roll back a suspension that already took effect.
  await db
    .collection('users')
    .doc(uid)
    .collection('notices')
    .add({
      type: suspended ? 'group-suspended' : 'group-reinstated',
      groupId,
      groupName: result.groupName,
      ownerEmail: result.ownerEmail,
      ownerName: result.ownerName,
      createdAt: Date.now(),
    })
    .catch((error) => logger.error('Nem sikerült létrehozni az értesítést', { uid, error }));

  return { suspended };
});
