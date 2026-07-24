import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from '@react-native-firebase/firestore';
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
