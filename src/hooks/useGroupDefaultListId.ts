import { useCallback, useEffect, useState } from 'react';
import { getExistingGroupDefaultListId, getOrCreateGroupDefaultList } from '../services/groups';

/**
 * Backs a group's shared quick-add. The hidden group list is only created when a
 * member actually adds the first loose item — opening/joining the group never
 * creates a stray "Bevásárlólista".
 */
export function useGroupDefaultList(groupId: string) {
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListId(null);
    getExistingGroupDefaultListId(groupId).then((id) => {
      if (!cancelled) setListId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const ensureListId = useCallback(async () => {
    const list = await getOrCreateGroupDefaultList(groupId);
    setListId(list.id);
    return list.id;
  }, [groupId]);

  return { listId, ensureListId };
}
