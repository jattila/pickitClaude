import { useEffect, useState } from 'react';
import { subscribeGroupLists } from '../services/groups';
import { FirestoreListsRepository } from '../data/cloud/FirestoreListsRepository';
import type { ShoppingList } from '../data/types';

export function useGroupLists(groupId: string) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeGroupLists(groupId, (next) => {
      setLists(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [groupId]);

  return {
    lists,
    loading,
    createList: (name: string) => FirestoreListsRepository.createList(name, groupId),
  };
}
