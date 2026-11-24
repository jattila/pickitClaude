import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireVerifiedUid } from '../lib/requireVerified';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { generateInviteCode } from '../lib/generateCode';

const EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_GENERATION_ATTEMPTS = 5;

export const createInvite = onCall(async (request) => {
  const uid = requireVerifiedUid(request);

  const groupId = request.data?.groupId;
  if (typeof groupId !== 'string' || !groupId) {
    throw new HttpsError('invalid-argument', 'Hiányzik a groupId.');
  }

  // The invite is tied to an address so the member list can show who is still
  // outstanding. It stays a shareable code rather than becoming an emailed
  // link — we send no mail — but it now has a name attached to it.
  const rawEmail = request.data?.email;
  if (typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'Adj meg egy érvényes e-mail címet.');
  }
  const invitedEmail = rawEmail.trim().toLowerCase();

  const db = getFirestore();
  const groupSnap = await db.collection('groups').doc(groupId).get();
  if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport nem található.');

  const groupData = groupSnap.data()!;
  const memberIds: string[] = groupData.memberIds ?? [];
  if (!memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'Nem vagy tagja ennek a csoportnak.');
  }

  // Someone already in the group. An invite would only add a pending row beside
  // their member row. A suspended member keeps their member document, and is
  // let back in from the member list, not through a fresh code.
  const account = await getAuth().getUserByEmail(invitedEmail).catch(() => null);
  if (account) {
    const memberSnap = await groupSnap.ref.collection('members').doc(account.uid).get();
    if (memberSnap.exists) {
      if (memberSnap.data()?.suspended) {
        throw new HttpsError(
          'failed-precondition',
          'Ez a cím egy felfüggesztett tagé. A tagok listájában tudod visszaengedélyezni.'
        );
      }
      throw new HttpsError('already-exists', 'Ez a cím már a csoport egyik tagjáé.');
    }
  }

  const invitesRef = db.collection('invites');
  const now = Date.now();

  // Asked twice for the same address: hand back the invite that is still open
  // instead of minting a second code for the same person. Two pending rows for
  // one address, each withdrawable separately, are not what anyone meant.
  // Inviting again means sending again, usually because the first message was
  // lost, so the week starts over.
  const open = await invitesRef
    .where('groupId', '==', groupId)
    .where('invitedEmail', '==', invitedEmail)
    .where('redeemedAt', '==', null)
    .get();
  const live = open.docs.find((doc) => {
    const data = doc.data();
    return !data.revoked && (data.expiresAt ?? 0) > now;
  });
  if (live) {
    await live.ref.update({
      expiresAt: now + EXPIRES_IN_MS,
      expiresAtTime: Timestamp.fromMillis(now + EXPIRES_IN_MS),
    });
    return { code: live.id, reused: true };
  }

  let code = '';
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateInviteCode();
    const existing = await invitesRef.doc(candidate).get();
    if (!existing.exists) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new HttpsError('internal', 'Nem sikerült egyedi kódot generálni, próbáld újra.');

  await invitesRef.doc(code).set({
    groupId,
    groupName: groupData.name ?? '',
    invitedEmail,
    createdBy: uid,
    createdAt: now,
    /** Set on redemption; until then this invite shows as pending in the member list. */
    redeemedAt: null,
    expiresAt: now + EXPIRES_IN_MS,
    // Duplicate of expiresAt as a Timestamp, purely so the Firestore TTL policy
    // can garbage-collect spent invites — TTL only understands Timestamp
    // fields and silently ignores numeric ones. The millis field above stays
    // the one the redeem/preview checks read.
    expiresAtTime: Timestamp.fromMillis(now + EXPIRES_IN_MS),
    maxUses: null,
    useCount: 0,
    revoked: false,
  });

  return { code, reused: false };
});
