import { useCallback, useEffect, useState } from 'react';
import { getExistingGroupDefaultListId, getOrCreateGroupDefaultList } from '../services/groups';

/**
 * Backs a group's shared quick-add. The hidden group list is only created when a
 * member actually adds the first loose item — opening/joining the group never
 * creates a stray "Bevásárlólista".
 */
export function useGroupDefaultList(groupId: string, mainListId: string | null = null) {
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListId(null);
    // mainListId arrives a beat after the screen mounts (it comes from the
    // groups listener), so this reruns when it lands — otherwise a group formed
    // by sharing would keep resolving the empty `gdefault_` list instead.
    getExistingGroupDefaultListId(groupId, mainListId)
      .then((id) => {
        if (!cancelled) setListId(id);
      })
      // Leaves listId null so the first add resolves it via ensureListId
      // instead of surfacing an unhandled rejection.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [groupId, mainListId]);

  const ensureListId = useCallback(async () => {
    const list = await getOrCreateGroupDefaultList(groupId, mainListId);
    setListId(list.id);
    return list.id;
  }, [groupId, mainListId]);

  return { listId, ensureListId };
}
