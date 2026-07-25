import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import { useAuthStore } from '../store/authStore';
import type { ShoppingItem } from '../data/types';

/** Favourites first, then alphabetical — 'hu' so ö/ő/ü/ű land where Hungarian expects. */
function byFavoriteThenName(a: ShoppingItem, b: ShoppingItem): number {
  if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
  return a.name.localeCompare(b.name, 'hu');
}

export function useListItems(listId: string | null) {
  const repo = useRepository();
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId) {
      setItems([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    const unsubscribe = repo.subscribeItems(listId, (next) => {
      setItems(next);
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, listId]);

  // Sorted here rather than in the query: the backing stores differ (SQLite vs
  // Firestore), lists are small enough that it's free, and a Firestore orderBy
  // would drop any document missing the field it sorts on.
  const activeItems = items.filter((item) => !item.checked).sort(byFavoriteThenName);
  const checkedItems = items.filter((item) => item.checked).sort(byFavoriteThenName);

  return {
    items,
    activeItems,
    checkedItems,
    loading,
    addItem: (rawName: string, quantity?: string | null) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.addItem(listId, rawName, quantity);
    },
    renameItem: (itemId: string, newName: string) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.renameItem(listId, itemId, newName);
    },
    setItemQuantity: (itemId: string, quantity: string | null) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.setItemQuantity(listId, itemId, quantity);
    },
    setItemFavorite: (itemId: string, favorite: boolean) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.setItemFavorite(listId, itemId, favorite);
    },
    // The checker's name comes from the signed-in user, not the caller —
    // previously nothing passed it through and checked items always ended up
    // with checkedByName: null.
    checkItem: (itemId: string) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.checkItem(listId, itemId, user?.displayName || user?.email || null);
    },
    restoreItem: (itemId: string) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.restoreItem(listId, itemId);
    },
    deleteItem: (itemId: string) => {
      if (!listId) throw new Error('Nincs kiválasztott lista.');
      return repo.deleteItem(listId, itemId);
    },
  };
}
