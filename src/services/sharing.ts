import { doc, getDoc, setDoc, updateDoc, type DocumentData } from '@react-native-firebase/firestore';
import { firestore, auth } from './firebase';
import { createGroup } from './groups';

/**
 * Sharing, in this app, is not a move — it is an audience being attached to a
 * list that stays exactly where it was. `lists.groupId` names that audience, so
 * "share" and "unshare" are one field flipping between a group id and null.
 *
 * That inverts the old order of operations. Before, a group was a container you
 * created first and then made lists inside; now you make the list, and the group
 * comes into being at the moment you decide who else should see it. The group
 * name is asked for at that moment because it is the answer to "who is this
 * for" — "Kovács Család", "Buli" — not a folder you filed something into.
 */

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Nincs bejelentkezve felhasználó.');
  return uid;
}

export interface ShareResult {
  groupId: string;
  groupName: string;
}

/**
 * Creates the audience and hands the list to it.
 *
 * `asMain` marks this as the group's whole shopping list — the one that surfaces
 * inline on every member's home screen. A single shared list (the party case)
 * leaves it false and shows up among the rows instead, which is what keeps
 * "share my shopping list" and "share this one list" from needing two mechanisms.
 *
 * The group is written first on purpose: the security rule for the list checks
 * that the caller is a member of the group being named, so the group has to
 * exist by the time the list update lands.
 */
export async function shareList(
  listId: string,
  groupName: string,
  asMain: boolean
): Promise<ShareResult> {
  const uid = requireUid();
  const trimmed = groupName.trim();
  if (!trimmed) throw new Error('Adj nevet a csoportnak.');

  const snap = await getDoc(doc(firestore, 'lists', listId));
  if (!snap.exists()) throw new Error('Ez a lista már nem érhető el.');

  const data = snap.data() as DocumentData;
  if ((data.groupId ?? null) !== null) {
    throw new Error('Ez a lista már meg van osztva.');
  }
  // Only the owner can hand a list to an audience. Anyone else reaching this
  // point is already a member of some group through it, and re-sharing someone
  // else's list would quietly widen who can see their items.
  if (data.ownerId !== uid) {
    throw new Error('Csak a lista tulajdonosa oszthatja meg.');
  }

  const group = await createGroup(trimmed, asMain ? listId : null);
  await updateDoc(doc(firestore, 'lists', listId), {
    groupId: group.id,
    updatedAt: Date.now(),
  });

  // The profile's defaultListId is what "my own shopping list" resolves to. Left
  // pointing at the list we just gave away, the home screen would offer the same
  // list twice — once as yours, once as the group's — and both would write to it.
  // Clearing it means your private list starts empty again, created on the next
  // loose item, while the shared one lives under the group from here on.
  const userRef = doc(firestore, 'users', uid);
  const userSnap = await getDoc(userRef).catch(() => null);
  if (userSnap?.exists() && (userSnap.data() as DocumentData).defaultListId === listId) {
    await setDoc(userRef, { defaultListId: null }, { merge: true });
  }

  return { groupId: group.id, groupName: group.name };
}

/**
 * Takes a list back out of its group. The group itself survives — it may hold
 * other lists, and its members and catalog are worth keeping — but it stops
 * pointing at this list as its main one, so no member is left with a home-screen
 * section backed by something they can no longer read.
 *
 * Clearing `mainListId` is best-effort: only the group's owner may write the
 * group document, and a member who owns a list inside it can still withdraw that
 * list. In that case the stale pointer resolves to an unreadable list, which the
 * home screen already treats as "nothing to show".
 */
export async function unshareList(listId: string): Promise<void> {
  const uid = requireUid();

  const snap = await getDoc(doc(firestore, 'lists', listId));
  if (!snap.exists()) throw new Error('Ez a lista már nem érhető el.');

  const data = snap.data() as DocumentData;
  const groupId: string | null = data.groupId ?? null;
  if (!groupId) return;
  if (data.ownerId !== uid) {
    throw new Error('Csak a lista tulajdonosa szüntetheti meg a megosztást.');
  }

  await updateDoc(doc(firestore, 'lists', listId), {
    groupId: null,
    updatedAt: Date.now(),
  });

  const groupSnap = await getDoc(doc(firestore, 'groups', groupId)).catch(() => null);
  if (groupSnap?.exists() && (groupSnap.data() as DocumentData).mainListId === listId) {
    await updateDoc(doc(firestore, 'groups', groupId), {
      mainListId: null,
      updatedAt: Date.now(),
    }).catch(() => undefined);
  }
}
