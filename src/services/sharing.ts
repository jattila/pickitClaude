import { doc, getDoc, updateDoc, type DocumentData } from '@react-native-firebase/firestore';
import { firestore, auth } from './firebase';
import { createGroup } from './groups';

/**
 * Sharing, in this app, is not a move — it is an audience being attached to a
 * list that stays exactly where it was. `lists.groupId` names that audience, so
 * "share" and "unshare" are one field flipping between a group id and null.
 *
 * That inverts the old order of operations. Before, a group was a container you
 * created first and then made lists inside; now you make the list, and the group
 * comes into being at the moment you decide who else should see it.
 *
 * The circle is never named separately: it takes the list's name. An occasional
 * list already has one worth using ("Szülinapi buli"), and the whole shopping
 * list is renamed at the moment of sharing, so one name covers the list, the
 * circle, and the header. Two names for one thing is one too many.
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

export interface ShareOptions {
  /** True for the whole shopping list, false for one list among the others. */
  asMain: boolean;
  /** Renames the list before sharing. Used for the whole shopping list, whose
   *  own name ("Bevásárlólista") says nothing about who it is for. */
  newName?: string;
  /**
   * Hands the list to a circle that already exists instead of making one.
   *
   * Offered only for occasional lists. The whole shopping list always gets its
   * own circle: a group carries at most one `mainListId`, and only its owner may
   * write the group document — so "put my shopping list into your circle" is
   * either a conflict or a permission error, neither of which is worth a dialog.
   */
  existingGroupId?: string;
}

export async function shareList(listId: string, options: ShareOptions): Promise<ShareResult> {
  const uid = requireUid();

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

  const listRef = doc(firestore, 'lists', listId);
  const now = Date.now();

  if (options.existingGroupId) {
    if (options.asMain) {
      throw new Error('A teljes bevásárlólista mindig saját kört kap.');
    }
    const groupSnap = await getDoc(doc(firestore, 'groups', options.existingGroupId));
    if (!groupSnap.exists()) throw new Error('Ez a kör már nem létezik.');
    const group = groupSnap.data() as DocumentData;
    if (!((group.memberIds as string[]) ?? []).includes(uid)) {
      throw new Error('Nem vagy tagja ennek a körnek.');
    }
    await updateDoc(listRef, { groupId: options.existingGroupId, updatedAt: now });
    return { groupId: options.existingGroupId, groupName: group.name };
  }

  const name = (options.newName ?? data.name ?? '').trim();
  if (!name) throw new Error('Adj nevet a listának.');

  // Renamed first, so the list and the circle cannot end up disagreeing if the
  // group write fails: an unshared list under a new name is a harmless state.
  if (name !== data.name) {
    await updateDoc(listRef, { name, updatedAt: now });
  }

  const group = await createGroup(name, options.asMain ? listId : null);
  await updateDoc(listRef, { groupId: group.id, updatedAt: Date.now() });

  // The profile's defaultListId deliberately stays where it is. The list is the
  // same document it always was — it has only gained an audience — so the home
  // screen should go on writing into it, now with everyone else watching.

  return { groupId: group.id, groupName: group.name };
}

/**
 * Takes a list back out of its circle. The circle itself survives — it may hold
 * other lists, and its members and catalog are worth keeping — but it stops
 * pointing at this list as its main one, so no member is left with a home screen
 * backed by something they can no longer read.
 *
 * Clearing `mainListId` is best-effort: only the circle's owner may write the
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
