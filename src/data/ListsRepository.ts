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
   * The personal list used for "quick add" (no list picked explicitly).
   * `getExistingDefaultListId` returns it only if it already exists (never
   * creates), so merely opening the app makes no list; `getOrCreateDefaultList`
   * creates it lazily on the first loose item added.
   */
  getExistingDefaultListId(): Promise<string | null>;
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
  /**
   * Free text ("2", "2 kg", "1 doboz") rather than a number — quantities are
   * as often a unit or a package as a count. Never reaches the catalog: that
   * is keyed on the product, and "2 kg" is not a different product from "kg".
   */
  setItemQuantity(listId: string, itemId: string, quantity: string | null): Promise<void>;
  setItemFavorite(listId: string, itemId: string, favorite: boolean): Promise<void>;
  checkItem(listId: string, itemId: string, checkedByName: string | null): Promise<void>;
  restoreItem(listId: string, itemId: string): Promise<void>;
  deleteItem(listId: string, itemId: string): Promise<void>;

  /**
   * The whole catalog for a scope (null = the caller's personal one). Backs
   * both the catalog editor and autocomplete: matching happens client-side,
   * since Firestore can only do prefix ranges and suggestions need to match
   * mid-word too.
   */
  getCatalogEntries(groupId: string | null): Promise<CatalogEntry[]>;
  renameCatalogEntry(groupId: string | null, catalogId: string, newName: string): Promise<void>;
  deleteCatalogEntry(groupId: string | null, catalogId: string): Promise<void>;
}
