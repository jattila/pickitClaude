import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { requireVerifiedUid } from '../lib/requireVerified';

export type PendingInviteStatus = 'invited' | 'awaiting-verification';

interface InviteDoc {
  code: string;
  invitedEmail?: string;
  expiresAt?: number;
  createdAt?: number;
  revoked?: boolean;
}

/**
 * The group's outstanding invites, so the member list can show who has been
 * asked but hasn't joined yet.
 *
 * It has to run server-side for two reasons: `invites` is closed to clients
 * entirely (the rules deny all direct access), and deciding between the two
 * states means looking the address up in Firebase Auth, which only the Admin
 * SDK can do.
 *
 * Any member can call it — the member list is already visible to all of them,
 * emails included, so pending rows leak nothing new.
 */
export const getGroupInvites = onCall(async (request) => {
  const uid = requireVerifiedUid(request);

  const groupId = request.data?.groupId;
  if (typeof groupId !== 'string' || !groupId) {
    throw new HttpsError('invalid-argument', 'Hiányzik a groupId.');
  }

  const db = getFirestore();
  const groupSnap = await db.collection('groups').doc(groupId).get();
  if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport nem található.');

  const memberIds: string[] = groupSnap.data()!.memberIds ?? [];
  if (!memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'Nem vagy tagja ennek a csoportnak.');
  }

  const now = Date.now();
  const snap = await db
    .collection('invites')
    .where('groupId', '==', groupId)
    .where('redeemedAt', '==', null)
    .get();

  const auth = getAuth();
  const invites = await Promise.all(
    snap.docs
      .map((doc) => ({ code: doc.id, ...doc.data() }) as InviteDoc)
      // Expired and revoked invites are dead ends — showing them as "invited"
      // would promise something that can no longer happen.
      .filter((invite) => !invite.revoked && (invite.expiresAt ?? 0) > now)
      // Invites created before this feature carry no address; there is nobody
      // to name, so they stay out of the list rather than showing as blank.
      .filter(
        (invite): invite is InviteDoc & { invitedEmail: string } =>
          typeof invite.invitedEmail === 'string' && !!invite.invitedEmail
      )
      .map(async (invite: InviteDoc & { invitedEmail: string }) => {
        // No account yet, or an account that hasn't confirmed its address: the
        // difference matters to whoever sent the invite, because the second
        // case is waiting on the invitee's mailbox, not on the invite.
        const status: PendingInviteStatus = await auth
          .getUserByEmail(invite.invitedEmail)
          .then((user) => (user.emailVerified ? 'invited' : 'awaiting-verification'))
          .catch(() => 'invited' as const);

        return { code: invite.code, email: invite.invitedEmail, status, createdAt: invite.createdAt ?? 0 };
      })
  );

  return { invites };
});
