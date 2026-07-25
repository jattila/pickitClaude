import { doc, setDoc, writeBatch } from '@react-native-firebase/firestore';
import { firestore } from './firebase';
import { getDb } from '../data/local/db';

const BATCH_LIMIT = 400; // stay comfortably under Firestore's 500-write batch cap

/**
 * One-time transfer of everything the guest built up locally into their new
 * Firestore account, run right after registration succeeds. The Firebase uid
 * is stable across the anonymous->registered upgrade in other apps, but here
 * (plain email/password signup) it's simply the uid of the freshly created user.
 */
export async function migrateGuestDataToCloud(uid: string): Promise<void> {
  const db = await getDb();
  const lists = await db.getAllAsync<any>('SELECT * FROM lists');

  let batch = writeBatch(firestore);
  let opCount = 0;

  const addOp = (fn: () => void) => {
    fn();
    opCount += 1;
    if (opCount >= BATCH_LIMIT) {
      return true;
    }
    return false;
  };

  const flush = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };

  // Lists must be committed *before* their items: the items/{itemId} security
  // rule does a get() on the parent list doc, and within a single atomic
  // batch that get() only sees the database state from before the batch —
  // writing a list and its own items in the same batch makes the parent look
  // like it doesn't exist yet, and the whole batch gets rejected.
  const itemsByList = new Map<string, any[]>();

  for (const list of lists) {
    const items = await db.getAllAsync<any>('SELECT * FROM items WHERE listId = ?', [list.id]);
    itemsByList.set(list.id, items);

    const listRef = doc(firestore, 'lists', list.id);
    if (
      addOp(() =>
        batch.set(listRef, {
          name: list.name,
          groupId: null,
          ownerId: uid,
          // Counters start at 0 — the onItemCreated trigger increments them as
          // the migrated items land, so setting them here would double-count.
          activeItemCount: 0,
          boughtItemCount: 0,
          lastActivityAt: list.updatedAt,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        })
      )
    ) {
      await flush();
    }
  }
  await flush(); // ensure every list doc is committed before any item references it

  for (const list of lists) {
    const items = itemsByList.get(list.id) ?? [];
    for (const item of items) {
      const itemRef = doc(firestore, 'lists', list.id, 'items', item.id);
      if (
        addOp(() =>
          batch.set(itemRef, {
            name: item.name,
            normalizedName: item.normalizedName,
            quantity: item.quantity ?? null,
            favorite: !!item.favorite,
            checked: !!item.checked,
            checkedBy: item.checked ? uid : null,
            checkedByName: item.checkedByName ?? null,
            checkedAt: item.checkedAt ?? null,
            addedBy: uid,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })
        )
      ) {
        await flush();
      }
    }
  }
  await flush();

  // The personal catalog is rebuilt server-side by the onItemCreated trigger as
  // the migrated items land, so there's nothing to copy up here.

  // Carry the guest's "quick add" default list reference over too, otherwise
  // getOrCreateDefaultList() won't find it post-migration and will spin up a
  // brand new (empty) "Bevásárlólista" alongside the one just migrated.
  const defaultListMeta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'defaultListId'"
  );
  if (defaultListMeta) {
    await setDoc(doc(firestore, 'users', uid), { defaultListId: defaultListMeta.value }, { merge: true });
  }

  await db.execAsync('DELETE FROM items; DELETE FROM lists; DELETE FROM catalog;');
}
