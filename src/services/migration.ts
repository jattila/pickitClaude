import { doc, writeBatch } from '@react-native-firebase/firestore';
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
  const catalog = await db.getAllAsync<any>('SELECT * FROM catalog');

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

  for (const list of lists) {
    const items = await db.getAllAsync<any>('SELECT * FROM items WHERE listId = ?', [list.id]);
    const activeItemCount = items.filter((i) => !i.checked).length;
    const boughtItemCount = items.filter((i) => i.checked).length;

    const listRef = doc(firestore, 'lists', list.id);
    if (
      addOp(() =>
        batch.set(listRef, {
          name: list.name,
          groupId: null,
          ownerId: uid,
          activeItemCount,
          boughtItemCount,
          lastActivityAt: list.updatedAt,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        })
      )
    ) {
      await flush();
    }

    for (const item of items) {
      const itemRef = doc(firestore, 'lists', list.id, 'items', item.id);
      if (
        addOp(() =>
          batch.set(itemRef, {
            name: item.name,
            normalizedName: item.normalizedName,
            quantity: item.quantity ?? null,
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

  for (const entry of catalog) {
    const catalogRef = doc(firestore, 'users', uid, 'catalog', entry.id);
    if (
      addOp(() =>
        batch.set(catalogRef, {
          name: entry.name,
          normalizedName: entry.normalizedName,
          usageCount: entry.usageCount,
          lastUsedAt: entry.lastUsedAt,
          createdAt: entry.createdAt,
        })
      )
    ) {
      await flush();
    }
  }

  await flush();

  await db.execAsync('DELETE FROM items; DELETE FROM lists; DELETE FROM catalog;');
}
