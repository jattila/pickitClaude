import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireVerifiedUid } from '../lib/requireVerified';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
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

  const invitesRef = db.collection('invites');
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

  const now = Date.now();
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

  return { code };
});
