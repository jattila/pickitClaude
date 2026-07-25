import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import type { ShoppingList } from '../data/types';

/** List name/groupId regardless of whether it's a personal or a group list. */
export function useListMeta(listId: string | null) {
  const repo = useRepository();
  const [list, setList] = useState<ShoppingList | null>(null);

  useEffect(() => {
    if (!listId) {
      setList(null);
      return;
    }
    return repo.subscribeListMeta(listId, setList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, listId]);

  return list;
}
