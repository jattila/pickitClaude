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
    checkedBy: data.checkedBy ?? null,
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

  /**
   * Checks for a name collision among sibling lists in the same scope
   * (personal, or a given group). The lists query is normally cached (it
   * backs the visible overview screen), but if it isn't — offline, cold
   * start — this can't confirm a collision either way; assume none rather
   * than blocking list creation/renaming while offline.
   */
  private async listNameExists(groupId: string | null, name: string, excludeListId?: string): Promise<boolean> {
    const uid = requireUid();
    const q = groupId
      ? query(collection(firestore, 'lists'), where('groupId', '==', groupId))
      : query(collection(firestore, 'lists'), where('ownerId', '==', uid), where('groupId', '==', null));
    const snap = await getDocs(q).catch(() => null);
    if (!snap) return false;
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

  async getExistingDefaultListId(): Promise<string | null> {
    const uid = requireUid();
    const userSnap = await getDoc(doc(firestore, 'users', uid)).catch(() => null);
    const defaultListId = userSnap?.exists() ? (userSnap.data() as DocumentData).defaultListId : null;
    if (!defaultListId) return null;
    // If we know the id but can't reach/verify the doc (offline), trust the id
    // from the profile rather than reporting "no default list".
    const existing = await getDoc(doc(firestore, 'lists', defaultListId)).catch(() => null);
    return !existing || existing.exists() ? defaultListId : null;
  }

  async getOrCreateDefaultList(): Promise<ShoppingList> {
    const uid = requireUid();
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef).catch(() => null);
    const defaultListId = userSnap?.exists() ? (userSnap.data() as DocumentData).defaultListId : null;

    if (defaultListId) {
      const existing = await getDoc(doc(firestore, 'lists', defaultListId)).catch(() => null);
      if (existing?.exists()) return toShoppingList(existing as QueryDocumentSnapshot<DocumentData>);
      // Couldn't read it, but the profile says it exists — reuse the id instead
      // of minting a second "Bevásárlólista".
      if (!existing) {
        return { id: defaultListId, name: 'Bevásárlólista', groupId: null, createdAt: 0, updatedAt: 0 };
      }
    }

    // Unlike the group default list (deterministic id), the personal one gets a
    // random id — creating it without being able to read the profile first
    // would risk a duplicate list once back online, so refuse instead.
    if (!userSnap) {
      throw new Error('Offline állapotban nem hozható létre az alapértelmezett lista. Csatlakozz az internethez.');
    }

    const list = await this.createList('Bevásárlólista', null, true);
    await setDoc(userRef, { defaultListId: list.id }, { merge: true });
    return list;
  }

  async renameList(listId: string, name: string): Promise<void> {
    const current = await getDoc(doc(firestore, 'lists', listId)).catch(() => null);
    const groupId = current?.exists() ? ((current.data() as DocumentData).groupId ?? null) : null;
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

    // getDoc() throws while offline unless this exact doc is already cached
    // (a brand-new item never is), so treat a failure as "not found" and fall
    // through to the write. Callers screen for already-present items against
    // the live items listener first (see useItemsPanel), and that data *is*
    // cache-backed offline — so this check is a backstop, not the guard.
    const existingSnap = await getDoc(itemRef).catch(() => null);
    if (existingSnap?.exists()) {
      const data = existingSnap.data() as DocumentData;
      // A doc missing the fields the items query orders by is invisible in the
      // list, yet still blocks re-adding it — re-adding is the only way a user
      // can reach it, so fall through and rewrite it in full to repair it.
      const isComplete = data.createdAt !== undefined && data.checked !== undefined;
      if (isComplete) {
        const item = toShoppingItem(listId, existingSnap as QueryDocumentSnapshot<DocumentData>);
        return { item, wasAlreadyChecked: item.checked };
      }
    }

    const uid = requireUid();
    // Every field must be written, including the initial checked-state: the
    // items query orders by `checked` and `createdAt`, and Firestore drops
    // documents that are missing an orderBy field — a partial write here
    // would create an item that never shows up in the list at all.
    await setDoc(itemRef, {
      name: trimmed,
      normalizedName,
      quantity,
      checked: false,
      checkedBy: null,
      checkedByName: null,
      checkedAt: null,
      addedBy: uid,
      createdAt: now,
      updatedAt: now,
    });
    // Catalog is maintained server-side by the onItemCreated trigger, which
    // routes the entry to the group's or the owner's catalog as appropriate.

    const item: ShoppingItem = {
      id,
      listId,
      name: trimmed,
      normalizedName,
      quantity,
      checked: false,
      checkedBy: null,
      checkedByName: null,
      checkedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    return { item, wasAlreadyChecked: false };
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

    // The item being renamed is already visible on-screen, so it's normally
    // cached from the active items listener even offline; the *target* name's
    // doc usually isn't, so that getDoc() is the one likely to throw offline —
    // treat that as "can't confirm a collision" rather than blocking the rename.
    const existingSnap = await getDoc(oldRef).catch(() => null);
    if (!existingSnap?.exists()) throw new Error('A tétel jelenleg nem érhető el az átnevezéshez.');

    const collisionExists = await getDoc(newRef)
      .then((snap) => snap.exists())
      .catch(() => false);
    if (collisionExists) throw new Error('Már van ilyen nevű tétel ezen a listán.');

    const data = existingSnap.data() as DocumentData;
    const batch = writeBatch(firestore);
    batch.delete(oldRef);
    batch.set(newRef, { ...data, name: trimmed, normalizedName, updatedAt: now });
    await batch.commit();
    // The delete + create pair re-triggers the catalog/counter functions for
    // the new item id; the old catalog entry stays as product history.
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

  /** Resolves whether a list feeds the group catalog or the owner's personal one. */
  private async catalogCollectionForList(listId: string) {
    const uid = requireUid();
    const listSnap = await getDoc(doc(firestore, 'lists', listId));
    const groupId = listSnap.exists() ? ((listSnap.data() as DocumentData).groupId ?? null) : null;
    return groupId
      ? collection(firestore, 'groups', groupId, 'catalog')
      : collection(firestore, 'users', uid, 'catalog');
  }

  /** Resolves a catalog scope directly — the editor isn't tied to any one list. */
  private catalogCollectionForScope(groupId: string | null) {
    const uid = requireUid();
    return groupId
      ? collection(firestore, 'groups', groupId, 'catalog')
      : collection(firestore, 'users', uid, 'catalog');
  }

  async getCatalogEntries(groupId: string | null): Promise<CatalogEntry[]> {
    const q = query(this.catalogCollectionForScope(groupId), orderBy('normalizedName', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
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
  }

  async renameCatalogEntry(groupId: string | null, catalogId: string, newName: string): Promise<void> {
    const trimmed = toDisplayName(newName);
    const { normalizedName, id: newId } = toItemId(trimmed);
    const coll = this.catalogCollectionForScope(groupId);
    const oldRef = doc(coll, catalogId);

    if (newId === catalogId) {
      await updateDoc(oldRef, { name: trimmed, normalizedName });
      return;
    }

    const newRef = doc(coll, newId);
    const [existing, collision] = await Promise.all([getDoc(oldRef), getDoc(newRef)]);
    if (collision.exists()) throw new Error('Már van ilyen nevű termék a katalógusban.');
    if (!existing.exists()) throw new Error('A termék már nem létezik a katalógusban.');

    const data = existing.data() as DocumentData;
    const batch = writeBatch(firestore);
    batch.delete(oldRef);
    batch.set(newRef, { ...data, name: trimmed, normalizedName });
    await batch.commit();
  }

  async deleteCatalogEntry(groupId: string | null, catalogId: string): Promise<void> {
    await deleteDoc(doc(this.catalogCollectionForScope(groupId), catalogId));
  }

  async getCatalogSuggestions(listId: string, prefix: string): Promise<CatalogEntry[]> {
    const normalizedPrefix = prefix.trim().toLowerCase();
    if (!normalizedPrefix) return [];
    const q = query(
      await this.catalogCollectionForList(listId),
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
