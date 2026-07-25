import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from '@react-native-firebase/firestore';
import type { ShoppingList } from '../data/types';
import { httpsCallable } from '@react-native-firebase/functions';
import { firestore, functions, auth } from './firebase';
import type { Group, GroupMember } from '../data/types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Nincs bejelentkezve felhasználó.');
  return uid;
}

function toGroup(snap: QueryDocumentSnapshot<DocumentData>): Group {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    ownerId: data.ownerId,
    memberIds: data.memberIds ?? [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function toGroupMember(snap: QueryDocumentSnapshot<DocumentData>): GroupMember {
  const data = snap.data();
  return {
    uid: snap.id,
    displayName: data.displayName ?? '',
    email: data.email ?? null,
    role: data.role,
    joinedAt: data.joinedAt,
  };
}

export async function createGroup(name: string): Promise<Group> {
  const uid = requireUid();
  const now = Date.now();
  const groupRef = doc(collection(firestore, 'groups'));

  let ownerDisplayName = '';
  const userSnap = await getDoc(doc(firestore, 'users', uid));
  if (userSnap.exists()) ownerDisplayName = (userSnap.data() as DocumentData).displayName ?? '';

  const batch = writeBatch(firestore);
  batch.set(groupRef, {
    name: name.trim(),
    ownerId: uid,
    memberIds: [uid],
    createdAt: now,
    updatedAt: now,
  });
  batch.set(doc(firestore, 'groups', groupRef.id, 'members', uid), {
    uid,
    displayName: ownerDisplayName,
    email: auth.currentUser?.email ?? null,
    role: 'owner',
    joinedAt: now,
  });
  await batch.commit();

  return {
    id: groupRef.id,
    name: name.trim(),
    ownerId: uid,
    memberIds: [uid],
    createdAt: now,
    updatedAt: now,
  };
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  await updateDoc(doc(firestore, 'groups', groupId), { name: name.trim(), updatedAt: Date.now() });
}

const BATCH_LIMIT = 400; // stay comfortably under Firestore's 500-write batch cap

/** Owner-only: deletes the group, its members, and every one of its lists (with their items). */
export async function deleteGroup(groupId: string): Promise<void> {
  let batch = writeBatch(firestore);
  let opCount = 0;
  const queue = async (fn: () => void) => {
    fn();
    opCount += 1;
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };

  const listsSnap = await getDocs(query(collection(firestore, 'lists'), where('groupId', '==', groupId)));
  for (const listDoc of listsSnap.docs) {
    const itemsSnap = await getDocs(collection(firestore, 'lists', listDoc.id, 'items'));
    for (const itemDoc of itemsSnap.docs) {
      await queue(() => batch.delete(itemDoc.ref));
    }
    await queue(() => batch.delete(listDoc.ref));
  }

  const membersSnap = await getDocs(collection(firestore, 'groups', groupId, 'members'));
  for (const memberDoc of membersSnap.docs) {
    await queue(() => batch.delete(memberDoc.ref));
  }

  await queue(() => batch.delete(doc(firestore, 'groups', groupId)));

  if (opCount > 0) await batch.commit();
}

export function subscribeMyGroups(onChange: (groups: Group[]) => void): () => void {
  const uid = requireUid();
  const q = query(
    collection(firestore, 'groups'),
    where('memberIds', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toGroup)));
}

export function subscribeGroupMembers(groupId: string, onChange: (members: GroupMember[]) => void): () => void {
  const q = query(collection(firestore, 'groups', groupId, 'members'), orderBy('joinedAt', 'asc'));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toGroupMember)));
}

export async function createInvite(groupId: string): Promise<string> {
  const call = httpsCallable<{ groupId: string }, { code: string }>(functions, 'createInvite');
  const result = await call({ groupId });
  return result.data.code;
}

export interface RedeemInviteResult {
  groupId: string;
  groupName: string;
  alreadyMember: boolean;
}

export async function redeemInvite(code: string): Promise<RedeemInviteResult> {
  const call = httpsCallable<{ code: string }, RedeemInviteResult>(functions, 'redeemInvite');
  const result = await call({ code: code.trim().toUpperCase() });
  return result.data;
}

export async function getInvitePreview(code: string): Promise<{ groupName: string } | null> {
  const call = httpsCallable<{ code: string }, { groupName: string | null }>(functions, 'getInvitePreview');
  const result = await call({ code: code.trim().toUpperCase() });
  if (!result.data.groupName) return null;
  return { groupName: result.data.groupName };
}

function toGroupList(snap: QueryDocumentSnapshot<DocumentData>) {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name as string,
    groupId: data.groupId as string,
    createdAt: data.createdAt as number,
    updatedAt: data.updatedAt as number,
  };
}

export async function getGroupLists(groupId: string) {
  const q = query(
    collection(firestore, 'lists'),
    where('groupId', '==', groupId),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(toGroupList);
}

export function subscribeGroupLists(
  groupId: string,
  onChange: (lists: ReturnType<typeof toGroupList>[]) => void
): () => void {
  const q = query(
    collection(firestore, 'lists'),
    where('groupId', '==', groupId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toGroupList)));
}

/** Deterministic doc id for a group's hidden "loose items" list, so concurrent
 * first-opens by different members resolve the same list instead of duplicating. */
function groupDefaultListId(groupId: string): string {
  return `gdefault_${groupId}`;
}

/** Returns the group's shared quick-add list id only if it already exists (never creates). */
export async function getExistingGroupDefaultListId(groupId: string): Promise<string | null> {
  const ref = doc(firestore, 'lists', groupDefaultListId(groupId));
  // Offline with nothing cached, getDoc() throws rather than resolving "absent";
  // reporting no list would strand the group's quick-add, so assume it exists —
  // the id is deterministic, so it's the right one either way.
  const snap = await getDoc(ref).catch(() => null);
  return !snap || snap.exists() ? ref.id : null;
}

/**
 * The group's shared quick-add list (created on first use). Like the personal
 * default list it's never shown in the group's list section — its items surface
 * directly on the group screen so members can jot loose items without picking a list.
 */
export async function getOrCreateGroupDefaultList(groupId: string): Promise<ShoppingList> {
  const uid = requireUid();
  const ref = doc(firestore, 'lists', groupDefaultListId(groupId));
  const snap = await getDoc(ref).catch(() => null);
  if (snap?.exists()) {
    const data = snap.data() as DocumentData;
    return { id: ref.id, name: data.name, groupId, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }
  // Safe to write blind when the read failed (offline): the id is derived from
  // the group id, so this converges on the same doc instead of duplicating.

  const now = Date.now();
  await setDoc(ref, {
    name: 'Bevásárlólista',
    groupId,
    ownerId: uid,
    activeItemCount: 0,
    boughtItemCount: 0,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id, name: 'Bevásárlólista', groupId, createdAt: now, updatedAt: now };
}

export function isGroupDefaultList(groupId: string, listId: string): boolean {
  return listId === groupDefaultListId(groupId);
}
