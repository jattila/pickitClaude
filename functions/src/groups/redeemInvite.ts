import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireVerifiedUid } from '../lib/requireVerified';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const redeemInvite = onCall(async (request) => {
  const uid = requireVerifiedUid(request);

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
    // Denormalized so other members can see it — they can't read this user's
    // own users/{uid} doc, which also holds settings and digest state.
    const email = userSnap.exists ? userSnap.data()!.email ?? null : null;

    const memberRef = groupRef.collection('members').doc(uid);
    tx.update(groupRef, {
      memberIds: FieldValue.arrayUnion(uid),
      updatedAt: Date.now(),
    });
    tx.set(memberRef, {
      uid,
      displayName,
      email,
      role: 'member',
      joinedAt: Date.now(),
    });
    // Marking it redeemed is what takes the pending row out of the member
    // list. Deliberately not checking that the caller's address matches
    // invitedEmail: the code is still shared by hand, and a family that
    // forwards it to the right person should not be blocked over whose
    // mailbox it travelled through.
    tx.update(inviteRef, { useCount: FieldValue.increment(1), redeemedAt: Date.now(), redeemedBy: uid });

    return { groupId: invite.groupId, groupName: invite.groupName, alreadyMember: false };
  });

  return result;
});
