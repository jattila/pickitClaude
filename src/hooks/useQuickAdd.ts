import { useCallback, useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';

/**
 * Backs the overview screen's quick-add. The hidden default list is NOT created
 * on mount — only when the user actually adds the first loose item (via
 * `ensureListId`). So merely opening the app (or joining a group) never spawns a
 * stray "Bevásárlólista".
 */
export function useDefaultList() {
  const repo = useRepository();
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListId(null);
    repo
      .getExistingDefaultListId()
      .then((id) => {
        if (!cancelled) setListId(id);
      })
      // Leaves listId null so the first add resolves it via ensureListId
      // instead of surfacing an unhandled rejection.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const ensureListId = useCallback(async () => {
    const list = await repo.getOrCreateDefaultList();
    setListId(list.id);
    return list.id;
  }, [repo]);

  return { listId, ensureListId };
}
