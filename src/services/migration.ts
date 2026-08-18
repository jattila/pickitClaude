import { doc, writeBatch } from '@react-native-firebase/firestore';
import { firestore } from './firebase';
import { getDb } from '../data/local/db';

const BATCH_LIMIT = 400; // stay comfortably under Firestore's 500-write batch cap

interface LocalList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface LocalItem {
  id: string;
  name: string;
  normalizedName: string;
  quantity: string | null;
  favorite: number;
  checked: number;
  checkedByName: string | null;
  checkedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface LocalCatalogEntry {
  id: string;
  name: string;
  normalizedName: string;
  usageCount: number;
  lastUsedAt: number;
  createdAt: number;
}

export interface MigrationResult {
  /** Whether anything actually moved — drives the "your list is in the cloud now" notice. */
  migrated: boolean;
  /** The guest's quick-add list, to be recorded on the profile the caller writes. */
  defaultListId: string | null;
}

/** Cheap enough to ask on any screen that needs to word itself differently. */
export async function hasLocalData(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM lists');
  return (row?.count ?? 0) > 0;
}

/**
 * Moves everything the phone holds locally into a freshly created account, once,
 * and then empties the local database.
 *
 * This runs exactly one time per account: the first verification after
 * registration, which is the only moment a guest's list would otherwise be lost.
 * Every later sign-in leaves local data alone — on a shared or borrowed phone,
 * migrating would sweep somebody else's shopping list into the account that
 * happens to be signing in.
 *
 * Deliberately does not touch the `users/{uid}` document itself — it returns the
 * default list id for the caller to write instead. The caller uses that
 * document's absence to decide whether to run this at all, so a half-written
 * profile here would look like a finished one and permanently strand whatever is
 * left. (Its `catalog` subcollection is fair game: writing into a subcollection
 * does not bring the parent document into existence.)
 */
export async function migrateGuestDataToCloud(uid: string): Promise<MigrationResult> {
  const db = await getDb();
  const lists = await db.getAllAsync<LocalList>('SELECT * FROM lists');
  if (lists.length === 0) return { migrated: false, defaultListId: null };

  const defaultMeta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'defaultListId'"
  );
  const defaultListId = defaultMeta?.value ?? null;

  let batch = writeBatch(firestore);
  let opCount = 0;
  const queue = async (write: () => void) => {
    write();
    opCount += 1;
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };
  const flush = async () => {
    if (opCount > 0) {
      await batch.commit();
      batch = writeBatch(firestore);
      opCount = 0;
    }
  };

  const itemsByList = new Map<string, LocalItem[]>();
  for (const list of lists) {
    itemsByList.set(
      list.id,
      await db.getAllAsync<LocalItem>('SELECT * FROM items WHERE listId = ?', [list.id])
    );
  }

  // Lists must be committed *before* their items: the items/{itemId} security
  // rule does a get() on the parent list doc, and within a single atomic batch
  // that get() only sees the database state from before the batch — writing a
  // list and its own items together makes the parent look like it doesn't exist
  // yet, and the whole batch is rejected.
  for (const list of lists) {
    await queue(() =>
      batch.set(doc(firestore, 'lists', list.id), {
        name: list.name,
        groupId: null,
        ownerId: uid,
        // Counters start at 0 — the onItemCreated trigger increments them as the
        // migrated items land, so setting them here would double-count.
        activeItemCount: 0,
        boughtItemCount: 0,
        lastActivityAt: list.updatedAt,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      })
    );
  }
  await flush();

  const migratedItemIds = new Set<string>();
  for (const list of lists) {
    for (const item of itemsByList.get(list.id) ?? []) {
      migratedItemIds.add(item.id);
      await queue(() =>
        batch.set(doc(firestore, 'lists', list.id, 'items', item.id), {
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
      );
    }
  }
  await flush();

  // Products the guest typed at some point but which aren't on any list right
  // now. The onItemCreated trigger rebuilds catalog entries for everything that
  // *is* on a list, so copying those too would double-count their usage — these
  // are the only ones that would otherwise vanish from autocomplete.
  const catalog = await db.getAllAsync<LocalCatalogEntry>('SELECT * FROM catalog');
  for (const entry of catalog) {
    if (migratedItemIds.has(entry.id)) continue;
    await queue(() =>
      batch.set(doc(firestore, 'users', uid, 'catalog', entry.id), {
        name: entry.name,
        normalizedName: entry.normalizedName,
        usageCount: entry.usageCount,
        lastUsedAt: entry.lastUsedAt,
        createdAt: entry.createdAt,
      })
    );
  }
  await flush();

  // Everything is up. Clearing the local tables is what makes the account's copy
  // the only one: from here the phone's storage starts a separate, empty life and
  // is seen again only after signing out.
  await db.execAsync('DELETE FROM items; DELETE FROM lists; DELETE FROM catalog;');
  await db.runAsync("DELETE FROM meta WHERE key = 'defaultListId'");

  return { migrated: true, defaultListId };
}
