import { useEffect, useMemo, useState } from 'react';
import { subscribeListsForGroups } from '../services/groups';
import type { Group, ShoppingList } from '../data/types';

/**
 * The lists shared with me through my groups.
 *
 * Kept separate from `useLists` (which stays strictly personal) because the two
 * answer different questions: one is "what did I make", the other "what am I
 * part of". The home screen shows them together, but a shared list is not mine
 * to treat as personal — it carries a group, and the UI says so.
 */
export function useSharedLists(groups: Group[]) {
  const [lists, setLists] = useState<ShoppingList[]>([]);

  // The groups array is a fresh object on every snapshot, so subscribing on it
  // directly would tear the listener down and rebuild it on every unrelated
  // group change. The id list is what the query actually depends on.
  const groupIdKey = useMemo(() => groups.map((g) => g.id).sort().join(','), [groups]);

  useEffect(() => {
    const groupIds = groupIdKey ? groupIdKey.split(',') : [];
    return subscribeListsForGroups(groupIds, setLists);
  }, [groupIdKey]);

  return lists;
}
