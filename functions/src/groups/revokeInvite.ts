import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { requireVerifiedUid } from '../lib/requireVerified';

/**
 * Withdraws an outstanding invite — the way back from a mistyped address,
 * which otherwise sits in the member list until the invite expires a week
 * later.
 *
 * Marked revoked rather than deleted: `redeemInvite` already refuses revoked
 * codes with a clear message, so someone who was sent the code learns it was
 * withdrawn instead of being told it never existed.
 *
 * Owner-only. Any member can *see* the pending list, but taking an invitation
 * back is a membership decision, and membership is the owner's to manage —
 * same reasoning as suspending.
 */
export const revokeInvite = onCall(async (request) => {
  const uid = requireVerifiedUid(request);

  const code = request.data?.code;
  if (typeof code !== 'string' || !code) {
    throw new HttpsError('invalid-argument', 'Hiányzik a meghívó kód.');
  }

  const db = getFirestore();
  const inviteRef = db.collection('invites').doc(code.toUpperCase());
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new HttpsError('not-found', 'Ez a meghívó nem található.');

  const invite = inviteSnap.data()!;
  if (invite.redeemedAt) {
    throw new HttpsError('failed-precondition', 'Ezt a meghívót már beváltották.');
  }

  const groupSnap = await db.collection('groups').doc(invite.groupId).get();
  if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport nem található.');
  if (groupSnap.data()!.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'Csak a csoport tulajdonosa vonhat vissza meghívót.');
  }

  await inviteRef.update({ revoked: true, revokedAt: Date.now(), revokedBy: uid });

  return { revoked: true };
});
