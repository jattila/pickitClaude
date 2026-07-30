import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireVerifiedUid } from '../lib/requireVerified';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Fills in the `email` field on member documents created before that field
 * existed, copying it from each member's users/{uid} document.
 *
 * Restricted to the group's owner. That leaks nothing new — every member of a
 * group can already read the member list, emails included, by design — but the
 * owner is the one managing members, so it's the narrowest sensible gate.
 *
 * Idempotent: members that already have an email, or whose user document has
 * none, are left alone, so re-running it is free and safe.
 */
export const backfillMemberEmails = onCall(async (request) => {
  const callerUid = requireVerifiedUid(request);

  const { groupId } = request.data ?? {};
  if (typeof groupId !== 'string' || !groupId) {
    throw new HttpsError('invalid-argument', 'Hiányzik a groupId.');
  }

  const db = getFirestore();
  const groupSnap = await db.collection('groups').doc(groupId).get();
  if (!groupSnap.exists) throw new HttpsError('not-found', 'A csoport nem található.');
  if (groupSnap.data()!.ownerId !== callerUid) {
    throw new HttpsError('permission-denied', 'Csak a csoport tulajdonosa futtathatja.');
  }

  const membersSnap = await db.collection('groups').doc(groupId).collection('members').get();
  const missing = membersSnap.docs.filter((d) => !d.data().email);
  if (missing.length === 0) return { updated: 0 };

  const userSnaps = await db.getAll(...missing.map((d) => db.collection('users').doc(d.id)));

  const batch = db.batch();
  let updated = 0;
  userSnaps.forEach((userSnap, index) => {
    const email = userSnap.exists ? userSnap.data()!.email ?? null : null;
    if (!email) return;
    batch.set(missing[index].ref, { email }, { merge: true });
    updated += 1;
  });

  if (updated > 0) await batch.commit();
  return { updated };
});
