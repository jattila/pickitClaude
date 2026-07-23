import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { createGroup, subscribeMyGroups } from '../services/groups';
import type { Group } from '../data/types';

export function useGroups() {
  const user = useAuthStore((state) => state.user);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeMyGroups((next) => {
      setGroups(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return {
    groups,
    loading,
    createGroup: (name: string) => createGroup(name),
  };
}
