import { getDb } from './db';
import { toDisplayName, toItemId } from '../../services/normalize';
import type { ListsRepository } from '../ListsRepository';
import type { AddItemResult, CatalogEntry, ShoppingItem, ShoppingList } from '../types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function toShoppingList(row: any): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    groupId: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toShoppingItem(row: any): ShoppingItem {
  return {
    id: row.id,
    listId: row.listId,
    name: row.name,
    normalizedName: row.normalizedName,
    quantity: row.quantity ?? null,
    checked: !!row.checked,
    checkedByName: row.checkedByName ?? null,
    checkedAt: row.checkedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Guest-mode repository backed entirely by on-device SQLite — no network involved. */
class LocalListsRepositoryImpl implements ListsRepository {
  private listsListeners = new Set<(lists: ShoppingList[]) => void>();
  private itemsListeners = new Map<string, Set<(items: ShoppingItem[]) => void>>();

  private async notifyListsChanged() {
    if (this.listsListeners.size === 0) return;
    const lists = await this.getLists();
    this.listsListeners.forEach((cb) => cb(lists));
  }

  private async notifyItemsChanged(listId: string) {
    const listeners = this.itemsListeners.get(listId);
    if (!listeners || listeners.size === 0) return;
    const items = await this.getItems(listId);
    listeners.forEach((cb) => cb(items));
  }

  async getLists(): Promise<ShoppingList[]> {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT * FROM lists ORDER BY updatedAt DESC');
    return rows.map(toShoppingList);
  }

  subscribeLists(onChange: (lists: ShoppingList[]) => void): () => void {
    this.listsListeners.add(onChange);
    this.getLists().then(onChange);
    return () => this.listsListeners.delete(onChange);
  }

  subscribeListMeta(listId: string, onChange: (list: ShoppingList | null) => void): () => void {
    const listener = (lists: ShoppingList[]) => onChange(lists.find((l) => l.id === listId) ?? null);
    this.listsListeners.add(listener);
    this.getLists().then(listener);
    return () => this.listsListeners.delete(listener);
  }

  async createList(name: string, _groupId: string | null = null): Promise<ShoppingList> {
    // Guests have no groups — always creates a personal list regardless of _groupId.
    const db = await getDb();
    const now = Date.now();
    const id = generateId('list');
    await db.runAsync('INSERT INTO lists (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [
      id,
      name.trim(),
      now,
      now,
    ]);
    await this.notifyListsChanged();
    return { id, name: name.trim(), groupId: null, createdAt: now, updatedAt: now };
  }

  async renameList(listId: string, name: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE lists SET name = ?, updatedAt = ? WHERE id = ?', [
      name.trim(),
      Date.now(),
      listId,
    ]);
    await this.notifyListsChanged();
  }

  async deleteList(listId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM items WHERE listId = ?', [listId]);
    await db.runAsync('DELETE FROM lists WHERE id = ?', [listId]);
    await this.notifyListsChanged();
  }

  async getItems(listId: string): Promise<ShoppingItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync(
      'SELECT * FROM items WHERE listId = ? ORDER BY checked ASC, createdAt ASC',
      [listId]
    );
    return rows.map(toShoppingItem);
  }

  subscribeItems(listId: string, onChange: (items: ShoppingItem[]) => void): () => void {
    if (!this.itemsListeners.has(listId)) this.itemsListeners.set(listId, new Set());
    const listeners = this.itemsListeners.get(listId)!;
    listeners.add(onChange);
    this.getItems(listId).then(onChange);
    return () => listeners.delete(onChange);
  }

  async addItem(listId: string, rawName: string, quantity: string | null = null): Promise<AddItemResult> {
    const trimmed = toDisplayName(rawName);
    const { normalizedName, id } = toItemId(trimmed);
    const db = await getDb();
    const now = Date.now();

    const existing = await db.getFirstAsync<any>('SELECT * FROM items WHERE listId = ? AND id = ?', [
      listId,
      id,
    ]);

    if (existing) {
      const item = toShoppingItem(existing);
      return { item, wasAlreadyChecked: item.checked };
    }

    await db.runAsync(
      `INSERT INTO items (id, listId, name, normalizedName, quantity, checked, checkedByName, checkedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
      [id, listId, trimmed, normalizedName, quantity, now, now]
    );
    await this.upsertCatalog(trimmed, normalizedName, id, now);
    await this.notifyItemsChanged(listId);

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

  private async upsertCatalog(name: string, normalizedName: string, id: string, now: number) {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO catalog (id, name, normalizedName, usageCount, lastUsedAt, createdAt)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, usageCount = usageCount + 1, lastUsedAt = excluded.lastUsedAt`,
      [id, name, normalizedName, now, now]
    );
  }

  async renameItem(listId: string, itemId: string, newName: string): Promise<void> {
    const db = await getDb();
    const trimmed = toDisplayName(newName);
    const { normalizedName, id: newId } = toItemId(trimmed);
    const now = Date.now();

    if (newId === itemId) {
      await db.runAsync('UPDATE items SET name = ?, normalizedName = ?, updatedAt = ? WHERE listId = ? AND id = ?', [
        trimmed,
        normalizedName,
        now,
        listId,
        itemId,
      ]);
      await this.notifyItemsChanged(listId);
      return;
    }

    const collision = await db.getFirstAsync('SELECT id FROM items WHERE listId = ? AND id = ?', [
      listId,
      newId,
    ]);
    if (collision) {
      throw new Error('Már van ilyen nevű tétel ezen a listán.');
    }

    const existing = await db.getFirstAsync<any>('SELECT * FROM items WHERE listId = ? AND id = ?', [
      listId,
      itemId,
    ]);
    if (!existing) throw new Error('A tétel már nem létezik.');

    await db.runAsync('DELETE FROM items WHERE listId = ? AND id = ?', [listId, itemId]);
    await db.runAsync(
      `INSERT INTO items (id, listId, name, normalizedName, quantity, checked, checkedByName, checkedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        listId,
        trimmed,
        normalizedName,
        existing.quantity,
        existing.checked,
        existing.checkedByName,
        existing.checkedAt,
        existing.createdAt,
        now,
      ]
    );
    await this.upsertCatalog(trimmed, normalizedName, newId, now);
    await this.notifyItemsChanged(listId);
  }

  async checkItem(listId: string, itemId: string, checkedByName: string | null): Promise<void> {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      'UPDATE items SET checked = 1, checkedByName = ?, checkedAt = ?, updatedAt = ? WHERE listId = ? AND id = ?',
      [checkedByName, now, now, listId, itemId]
    );
    await this.notifyItemsChanged(listId);
  }

  async restoreItem(listId: string, itemId: string): Promise<void> {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      'UPDATE items SET checked = 0, checkedByName = NULL, checkedAt = NULL, updatedAt = ? WHERE listId = ? AND id = ?',
      [now, listId, itemId]
    );
    await this.notifyItemsChanged(listId);
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM items WHERE listId = ? AND id = ?', [listId, itemId]);
    await this.notifyItemsChanged(listId);
  }

  async getCatalogSuggestions(_listId: string, prefix: string): Promise<CatalogEntry[]> {
    const db = await getDb();
    const normalizedPrefix = prefix.trim().toLowerCase();
    if (!normalizedPrefix) return [];
    const rows = await db.getAllAsync(
      'SELECT * FROM catalog WHERE normalizedName LIKE ? ORDER BY usageCount DESC, lastUsedAt DESC LIMIT 10',
      [`${normalizedPrefix}%`]
    );
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      normalizedName: row.normalizedName,
      usageCount: row.usageCount,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
    }));
  }
}

export const LocalListsRepository: ListsRepository = new LocalListsRepositoryImpl();
