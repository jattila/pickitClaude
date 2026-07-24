import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';

/** Resolves the personal "quick add" list (creating it on first use) for the overview screen's input. */
export function useQuickAdd() {
  const repo = useRepository();
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListId(null);
    repo.getOrCreateDefaultList().then((list) => {
      if (!cancelled) setListId(list.id);
    });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return {
    listId,
    addItem: (name: string, quantity?: string | null) => {
      if (!listId) throw new Error('A gyors hozzáadás listája még nem áll készen.');
      return repo.addItem(listId, name, quantity);
    },
    restoreItem: (itemId: string) => {
      if (!listId) throw new Error('A gyors hozzáadás listája még nem áll készen.');
      return repo.restoreItem(listId, itemId);
    },
  };
}
