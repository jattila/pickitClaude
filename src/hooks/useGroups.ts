import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { createGroup, deleteGroup, renameGroup, subscribeMyGroups } from '../services/groups';
import type { Group } from '../data/types';

export function useGroups() {
  const user = useAuthStore((state) => state.user);
  // The hamburger menu mounts this beside the verification gate, not behind it.
  // Subscribing before the address is confirmed is refused by the rules, and a
  // refused listener is dead for good: keyed on `user` alone it never came back
  // after verification, and the menu showed no groups until a restart.
  const emailVerified = useAuthStore((state) => state.emailVerified);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !emailVerified) {
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
  }, [user, emailVerified]);

  return {
    groups,
    loading,
    createGroup: (name: string) => createGroup(name),
    renameGroup: (groupId: string, name: string) => renameGroup(groupId, name),
    deleteGroup: (groupId: string) => deleteGroup(groupId),
  };
}
