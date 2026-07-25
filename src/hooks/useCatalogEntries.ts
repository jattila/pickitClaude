import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

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
