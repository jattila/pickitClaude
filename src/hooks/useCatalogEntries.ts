import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useRepository } from '../data/useRepository';
import type { CatalogEntry } from '../data/types';

/**
 * Backs the catalog editor screens. `groupId` selects the scope directly
 * (null = personal catalog) — there's no realtime subscription here since the
 * editor is a manual maintenance screen, not something other members change
 * concurrently in a way that needs to be watched live.
 */
export function useCatalogEntries(groupId: string | null) {
  const repo = useRepository();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const results = await repo.getCatalogEntries(groupId);
    setEntries(results);
    setLoading(false);
  }, [repo, groupId]);

  // Re-reads every time the screen comes into focus, not just on mount. The
  // catalog fills up as a side effect of adding items on *other* screens — and
  // for cloud lists a Cloud Function writes the entry a moment after the item —
  // so what a one-shot load produced was already stale by the time the user
  // navigated here. The tab navigator keeps screens mounted, so nothing ever
  // triggered a second read and the list looked permanently empty.
  //
  // Deliberately does not flip `loading` back on: the previous entries stay
  // visible while the refresh runs, instead of flashing the empty state.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const renameEntry = async (catalogId: string, newName: string) => {
    await repo.renameCatalogEntry(groupId, catalogId, newName);
    await refresh();
  };

  const deleteEntry = async (catalogId: string) => {
    await repo.deleteCatalogEntry(groupId, catalogId);
    await refresh();
  };

  return { entries, loading, renameEntry, deleteEntry };
}
