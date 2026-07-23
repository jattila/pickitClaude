import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const redeemInvite = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Be kell jelentkezni.');

  const code = request.data?.code;
  if (typeof code !== 'string' || !code) {
    throw new HttpsError('invalid-argument', 'Hiányzik a meghívó kód.');
  }

  const db = getFirestore();
  const inviteRef = db.collection('invites').doc(code.toUpperCase());
  const userRef = db.collection('users').doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists) throw new HttpsError('not-found', 'Érvénytelen meghívó kód.');

    const invite = inviteSnap.data()!;
    if (invite.revoked) throw new HttpsError('failed-precondition', 'Ez a meghívó már vissza lett vonva.');
    if (invite.expiresAt < Date.now()) throw new HttpsError('failed-precondition', 'Ez a meghívó lejárt.');
    if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
      throw new HttpsError('failed-precondition', 'Ezt a meghívót már túl sokan használták.');
    }

    const groupRef = db.collection('groups').doc(invite.groupId);
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport már nem létezik.');

    const memberIds: string[] = groupSnap.data()!.memberIds ?? [];
    if (memberIds.includes(uid)) {
      return { groupId: invite.groupId, groupName: invite.groupName, alreadyMember: true };
    }

    const userSnap = await tx.get(userRef);
    const displayName = userSnap.exists ? userSnap.data()!.displayName ?? '' : '';

    const memberRef = groupRef.collection('members').doc(uid);
    tx.update(groupRef, {
      memberIds: FieldValue.arrayUnion(uid),
      updatedAt: Date.now(),
    });
    tx.set(memberRef, {
      uid,
      displayName,
      role: 'member',
      joinedAt: Date.now(),
    });
    tx.update(inviteRef, { useCount: FieldValue.increment(1) });

    return { groupId: invite.groupId, groupName: invite.groupName, alreadyMember: false };
  });

  return result;
});
