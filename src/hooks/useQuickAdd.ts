import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';

/** Resolves (creating on first use) the hidden personal list backing the overview screen's quick-add. */
export function useDefaultListId(): string | null {
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

  return listId;
}
