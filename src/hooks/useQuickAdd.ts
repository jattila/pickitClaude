import { useCallback, useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import { useUiStore } from '../store/uiStore';

/**
 * Backs the overview screen's quick-add. The hidden default list is NOT created
 * on mount — only when the user actually adds the first loose item (via
 * `ensureListId`). So merely opening the app (or joining a group) never spawns a
 * stray "Bevásárlólista".
 */
export function useDefaultList() {
  const repo = useRepository();
  // Signing in swaps the repository, but the migration that follows finishes
  // *after* that swap — without this the screen would keep the answer it got
  // mid-migration, which is "you have no list".
  const dataRevision = useUiStore((state) => state.dataRevision);
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
  }, [repo, dataRevision]);

  const ensureListId = useCallback(async () => {
    const list = await repo.getOrCreateDefaultList();
    setListId(list.id);
    return list.id;
  }, [repo]);

  return { listId, ensureListId };
}
