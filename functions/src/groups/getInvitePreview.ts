import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireVerifiedUid } from '../lib/requireVerified';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Lets a not-yet-member preview which group an invite code leads to, using the
 * group's *current* name — invites/{code}.groupName is only a denormalized
 * snapshot from creation time and goes stale on rename, so this always reads
 * the live groups/{groupId} doc via the Admin SDK instead.
 */
export const getInvitePreview = onCall(async (request) => {
  const uid = requireVerifiedUid(request);

  const code = request.data?.code;
  if (typeof code !== 'string' || !code) {
    throw new HttpsError('invalid-argument', 'Hiányzik a meghívó kód.');
  }

  const db = getFirestore();
  const inviteSnap = await db.collection('invites').doc(code.toUpperCase()).get();
  if (!inviteSnap.exists) return { groupName: null };

  const invite = inviteSnap.data()!;
  if (invite.revoked || invite.expiresAt < Date.now()) return { groupName: null };
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) return { groupName: null };

  const groupSnap = await db.collection('groups').doc(invite.groupId).get();
  if (!groupSnap.exists) return { groupName: null };

  return { groupName: groupSnap.data()!.name ?? '' };
});
