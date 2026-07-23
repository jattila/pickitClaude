import { useEffect, useState } from 'react';
import { subscribeGroupMembers } from '../services/groups';
import type { GroupMember } from '../data/types';

export function useGroupMembers(groupId: string) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeGroupMembers(groupId, (next) => {
      setMembers(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [groupId]);

  return { members, loading };
}
