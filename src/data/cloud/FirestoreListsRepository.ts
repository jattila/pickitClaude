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
  deleteDoc,
  where,
  limit,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from '@react-native-firebase/firestore';
import { firestore, auth } from '../../services/firebase';
import { normalizeName, toDisplayName, toItemId } from '../../services/normalize';
import type { ListsRepository } from '../ListsRepository';
import type { AddItemResult, CatalogEntry, ShoppingItem, ShoppingList } from '../types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Nincs bejelentkezve felhasználó.');
  return uid;
}

function toShoppingList(snap: QueryDocumentSnapshot<DocumentData>): ShoppingList {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    groupId: data.groupId ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function toShoppingItem(listId: string, snap: QueryDocumentSnapshot<DocumentData>): ShoppingItem {
  const data = snap.data();
  return {
    id: snap.id,
    listId,
    name: data.name,
    normalizedName: data.normalizedName,
    quantity: data.quantity ?? null,
    checked: !!data.checked,
    checkedByName: data.checkedByName ?? null,
    checkedAt: data.checkedAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** Registered-user repository backed by Firestore. M2 scope: personal (non-group) lists only. */
class FirestoreListsRepositoryImpl implements ListsRepository {
  async getLists(): Promise<ShoppingList[]> {
    const uid = requireUid();
    const q = query(
      collection(firestore, 'lists'),
      where('ownerId', '==', uid),
      where('groupId', '==', null),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(toShoppingList);
  }

  subscribeLists(onChange: (lists: ShoppingList[]) => void): () => void {
    const uid = requireUid();
    const q = query(
      collection(firestore, 'lists'),
      where('ownerId', '==', uid),
      where('groupId', '==', null),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snap) => onChange(snap.docs.map(toShoppingList)));
  }

  /** Checks for a name collision among sibling lists in the same scope (personal, or a given group). */
  private async listNameExists(groupId: string | null, name: string, excludeListId?: string): Promise<boolean> {
    const uid = requireUid();
    const q = groupId
      ? query(collection(firestore, 'lists'), where('groupId', '==', groupId))
      : query(collection(firestore, 'lists'), where('ownerId', '==', uid), where('groupId', '==', null));
    const snap = await getDocs(q);
    const target = normalizeName(name);
    return snap.docs.some(
      (d) => d.id !== excludeListId && normalizeName((d.data() as DocumentData).name) === target
    );
  }

  async createList(
    name: string,
    groupId: string | null = null,
    skipDuplicateCheck = false
  ): Promise<ShoppingList> {
    const uid = requireUid();
    if (!skipDuplicateCheck && (await this.listNameExists(groupId, name))) {
      throw new Error('Már van ilyen nevű lista ebben a körben.');
    }
    const now = Date.now();
    const ref = doc(collection(firestore, 'lists'));
    const list = {
      name: name.trim(),
      groupId,
      ownerId: uid,
      activeItemCount: 0,
      boughtItemCount: 0,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, list);
    return { id: ref.id, name: list.name, groupId, createdAt: now, updatedAt: now };
  }

  async getOrCreateDefaultList(): Promise<ShoppingList> {
    const uid = requireUid();
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    const defaultListId = userSnap.exists() ? (userSnap.data() as DocumentData).defaultListId : null;

    if (defaultListId) {
      const existing = await getDoc(doc(firestore, 'lists', defaultListId));
      if (existing.exists()) return toShoppingList(existing as QueryDocumentSnapshot<DocumentData>);
    }

    const list = await this.createList('Bevásárlólista', null, true);
    await setDoc(userRef, { defaultListId: list.id }, { merge: true });
    return list;
  }

  async renameList(listId: string, name: string): Promise<void> {
    const current = await getDoc(doc(firestore, 'lists', listId));
    const groupId = current.exists() ? ((current.data() as DocumentData).groupId ?? null) : null;
    if (await this.listNameExists(groupId, name, listId)) {
      throw new Error('Már van ilyen nevű lista ebben a körben.');
    }
    await updateDoc(doc(firestore, 'lists', listId), { name: name.trim(), updatedAt: Date.now() });
  }

  async deleteList(listId: string): Promise<void> {
    const itemsSnap = await getDocs(collection(firestore, 'lists', listId, 'items'));
    const batch = writeBatch(firestore);
    itemsSnap.docs.forEach((itemDoc) => batch.delete(itemDoc.ref));
    batch.delete(doc(firestore, 'lists', listId));
    await batch.commit();
  }

  subscribeListMeta(listId: string, onChange: (list: ShoppingList | null) => void): () => void {
    return onSnapshot(doc(firestore, 'lists', listId), (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(toShoppingList(snap as QueryDocumentSnapshot<DocumentData>));
    });
  }

  async getItems(listId: string): Promise<ShoppingItem[]> {
    const q = query(collection(firestore, 'lists', listId, 'items'), orderBy('checked', 'asc'), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toShoppingItem(listId, d));
  }

  subscribeItems(listId: string, onChange: (items: ShoppingItem[]) => void): () => void {
    const q = query(collection(firestore, 'lists', listId, 'items'), orderBy('checked', 'asc'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => toShoppingItem(listId, d))));
  }

  async addItem(listId: string, rawName: string, quantity: string | null = null): Promise<AddItemResult> {
    const trimmed = toDisplayName(rawName);
    const { normalizedName, id } = toItemId(trimmed);
    const now = Date.now();
    const itemRef = doc(firestore, 'lists', listId, 'items', id);

    const existingSnap = await getDoc(itemRef);
    if (existingSnap.exists()) {
      const item = toShoppingItem(listId, existingSnap as QueryDocumentSnapshot<DocumentData>);
      return { item, wasAlreadyChecked: item.checked };
    }

    const uid = requireUid();
    await setDoc(itemRef, {
      name: trimmed,
      normalizedName,
      quantity,
      checked: false,
      checkedByName: null,
      checkedAt: null,
      addedBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    await this.upsertCatalog(uid, trimmed, normalizedName, id, now);

    const item: ShoppingItem = {
      id,
      listId,
      name: trimmed,
      normalizedName,
      quantity,
      checked: false,
      checkedByName: null,
      checkedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    return { item, wasAlreadyChecked: false };
  }

  private async upsertCatalog(uid: string, name: string, normalizedName: string, id: string, now: number) {
    const catalogRef = doc(firestore, 'users', uid, 'catalog', id);
    const existing = await getDoc(catalogRef);
    if (existing.exists()) {
      const data = existing.data() as DocumentData;
      await setDoc(
        catalogRef,
        { name, normalizedName, usageCount: (data.usageCount ?? 0) + 1, lastUsedAt: now },
        { merge: true }
      );
    } else {
      await setDoc(catalogRef, { name, normalizedName, usageCount: 1, lastUsedAt: now, createdAt: now });
    }
  }

  async renameItem(listId: string, itemId: string, newName: string): Promise<void> {
    const trimmed = toDisplayName(newName);
    const { normalizedName, id: newId } = toItemId(trimmed);
    const now = Date.now();
    const oldRef = doc(firestore, 'lists', listId, 'items', itemId);

    if (newId === itemId) {
      await updateDoc(oldRef, { name: trimmed, normalizedName, updatedAt: now });
      return;
    }

    const newRef = doc(firestore, 'lists', listId, 'items', newId);
    const [existing, collision] = await Promise.all([getDoc(oldRef), getDoc(newRef)]);
    if (collision.exists()) throw new Error('Már van ilyen nevű tétel ezen a listán.');
    if (!existing.exists()) throw new Error('A tétel már nem létezik.');

    const data = existing.data() as DocumentData;
    const uid = requireUid();
    const batch = writeBatch(firestore);
    batch.delete(oldRef);
    batch.set(newRef, { ...data, name: trimmed, normalizedName, updatedAt: now });
    await batch.commit();
    await this.upsertCatalog(uid, trimmed, normalizedName, newId, now);
  }

  async checkItem(listId: string, itemId: string, checkedByName: string | null): Promise<void> {
    const uid = requireUid();
    await updateDoc(doc(firestore, 'lists', listId, 'items', itemId), {
      checked: true,
      checkedBy: uid,
      checkedByName,
      checkedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async restoreItem(listId: string, itemId: string): Promise<void> {
    await updateDoc(doc(firestore, 'lists', listId, 'items', itemId), {
      checked: false,
      checkedBy: null,
      checkedByName: null,
      checkedAt: null,
      updatedAt: Date.now(),
    });
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    await deleteDoc(doc(firestore, 'lists', listId, 'items', itemId));
  }

  async getCatalogSuggestions(_listId: string, prefix: string): Promise<CatalogEntry[]> {
    const uid = requireUid();
    const normalizedPrefix = prefix.trim().toLowerCase();
    if (!normalizedPrefix) return [];
    const q = query(
      collection(firestore, 'users', uid, 'catalog'),
      where('normalizedName', '>=', normalizedPrefix),
      where('normalizedName', '<=', normalizedPrefix + ''),
      orderBy('normalizedName'),
      limit(10)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        normalizedName: data.normalizedName,
        usageCount: data.usageCount,
        lastUsedAt: data.lastUsedAt,
        createdAt: data.createdAt,
      } as CatalogEntry;
    });
    return results.sort((a, b) => b.usageCount - a.usageCount);
  }
}

export const FirestoreListsRepository: ListsRepository = new FirestoreListsRepositoryImpl();
