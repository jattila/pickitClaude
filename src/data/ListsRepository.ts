import type { AddItemResult, CatalogEntry, ShoppingItem, ShoppingList } from './types';

/**
 * Common data-access contract implemented by both the guest (SQLite) and
 * registered-user (Firestore) backends, so screens/hooks don't need to know
 * which one is currently active.
 */
export interface ListsRepository {
  getLists(): Promise<ShoppingList[]>;
  /** Fires `onChange` whenever the lists collection changes; returns an unsubscribe fn. */
  subscribeLists(onChange: (lists: ShoppingList[]) => void): () => void;

  /** `groupId` is ignored by the guest (local) repository — guests have no groups. */
  createList(name: string, groupId?: string | null): Promise<ShoppingList>;
  renameList(listId: string, name: string): Promise<void>;
  deleteList(listId: string): Promise<void>;
  /**
   * Returns the personal list used for "quick add" (no list picked explicitly),
   * creating one on first use. It's a perfectly ordinary list — nothing marks
   * it as special in the UI, it's just remembered as the quick-add target.
   */
  getOrCreateDefaultList(): Promise<ShoppingList>;
  /** Single-list metadata (name, groupId, ...) regardless of whether it's personal or a group list. */
  subscribeListMeta(listId: string, onChange: (list: ShoppingList | null) => void): () => void;

  getItems(listId: string): Promise<ShoppingItem[]>;
  subscribeItems(listId: string, onChange: (items: ShoppingItem[]) => void): () => void;

  /**
   * Adds (or re-targets) an item by name. Because the item id is derived from the
   * normalized name, adding an already-checked product returns `wasAlreadyChecked: true`
   * instead of silently reactivating it — the UI must ask for confirmation before
   * calling `restoreItem`.
   */
  addItem(listId: string, rawName: string, quantity?: string | null): Promise<AddItemResult>;
  renameItem(listId: string, itemId: string, newName: string): Promise<void>;
  checkItem(listId: string, itemId: string, checkedByName: string | null): Promise<void>;
  restoreItem(listId: string, itemId: string): Promise<void>;
  deleteItem(listId: string, itemId: string): Promise<void>;

  getCatalogSuggestions(listId: string, prefix: string): Promise<CatalogEntry[]>;
}
