import { useEffect, useState } from 'react';
import { getOrCreateGroupDefaultList } from '../services/groups';

/** Resolves (creating on first use) the hidden shared list backing a group's quick-add. */
export function useGroupDefaultListId(groupId: string): string | null {
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListId(null);
    getOrCreateGroupDefaultList(groupId).then((list) => {
      if (!cancelled) setListId(list.id);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return listId;
}
