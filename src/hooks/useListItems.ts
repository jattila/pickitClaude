import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import { useAuthStore } from '../store/authStore';
import type { ShoppingItem } from '../data/types';

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

  const activeItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

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
