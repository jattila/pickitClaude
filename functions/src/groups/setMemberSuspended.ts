import { HttpsError, onCall } from 'firebase-functions/v2/https';
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
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Be kell jelentkezni.');

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
      memberEmail: member.email ?? null,
      memberName: member.displayName ?? '',
      ownerEmail: ownerSnap.exists ? ownerSnap.data()!.email ?? null : null,
      ownerName: ownerSnap.exists ? ownerSnap.data()!.displayName ?? '' : '',
    };
  });

  // Queued for the Firestore "Trigger Email" extension, which owns the actual
  // delivery — that keeps SMTP credentials out of this codebase entirely.
  // Failing to queue the mail must not undo a suspension that already applied,
  // so this is deliberately outside the transaction and non-fatal.
  if (result.memberEmail) {
    const greeting = result.memberName ? `Kedves ${result.memberName}!` : 'Szia!';
    const contact = result.ownerEmail
      ? `Ha ezt tévedésnek gondolod, írj a csoport tulajdonosának: ${result.ownerEmail}`
      : 'Ha ezt tévedésnek gondolod, keresd a csoport tulajdonosát.';

    const subject = suspended
      ? `Felfüggesztették a hozzáférésedet – ${result.groupName}`
      : `Újra hozzáférsz ehhez a csoporthoz – ${result.groupName}`;

    const body = suspended
      ? `${greeting}\n\nA(z) "${result.groupName}" csoporthoz való hozzáférésedet felfüggesztették, ezért a csoport listái és tételei egyelőre nem érhetők el a PickIt appban.\n\n${contact}\n\nÜdvözlettel,\nPickIt`
      : `${greeting}\n\nA(z) "${result.groupName}" csoporthoz való hozzáférésedet visszaállították, a listák és tételek ismét elérhetők a PickIt appban.\n\nÜdvözlettel,\nPickIt`;

    await db
      .collection('mail')
      .add({ to: [result.memberEmail], message: { subject, text: body } })
      .catch((error) => logger.error('Nem sikerült sorba állítani az e-mailt', { uid, error }));
  } else {
    logger.warn('Nincs elmentett e-mail cím a taghoz, értesítés kimarad', { groupId, uid });
  }

  return { suspended };
});
