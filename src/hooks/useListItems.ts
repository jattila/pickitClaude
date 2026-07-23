import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import type { ShoppingItem } from '../data/types';

export function useListItems(listId: string) {
  const repo = useRepository();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    addItem: (rawName: string, quantity?: string | null) => repo.addItem(listId, rawName, quantity),
    renameItem: (itemId: string, newName: string) => repo.renameItem(listId, itemId, newName),
    checkItem: (itemId: string, checkedByName: string | null = null) =>
      repo.checkItem(listId, itemId, checkedByName),
    restoreItem: (itemId: string) => repo.restoreItem(listId, itemId),
    deleteItem: (itemId: string) => repo.deleteItem(listId, itemId),
  };
}
