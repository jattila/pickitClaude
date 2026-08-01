import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getGroupInvites, type PendingInvite } from '../services/groups';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * The group's outstanding invites, for the member list.
 *
 * Fetched rather than subscribed: this comes from a callable (the invites
 * collection is closed to clients), and an invite's state only changes when
 * someone joins or confirms their address — neither of which is worth a live
 * listener. Re-reads on focus so returning to the screen shows the current
 * picture.
 */
export function useGroupInvites(groupId: string) {
  const { isConnected } = useNetworkStatus();
  const [invites, setInvites] = useState<PendingInvite[]>([]);

  const refresh = useCallback(async () => {
    if (!groupId || !isConnected) return;
    // Leaves the previous list in place on failure: a transient error should
    // not make pending members appear to vanish.
    await getGroupInvites(groupId)
      .then(setInvites)
      .catch(() => undefined);
  }, [groupId, isConnected]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { invites, refresh };
}
