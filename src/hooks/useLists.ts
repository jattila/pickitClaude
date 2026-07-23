import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import type { ShoppingList } from '../data/types';

export function useLists() {
  const repo = useRepository();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = repo.subscribeLists((next) => {
      setLists(next);
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  return {
    lists,
    loading,
    createList: (name: string, groupId?: string | null) => repo.createList(name, groupId),
    renameList: (listId: string, name: string) => repo.renameList(listId, name),
    deleteList: (listId: string) => repo.deleteList(listId),
  };
}
