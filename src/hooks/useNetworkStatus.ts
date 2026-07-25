import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Optimistically assumes online until the first NetInfo event arrives, so the
 * UI doesn't flash an "offline" state on every cold start.
 */
export function useNetworkStatus(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
    });
  }, []);

  return { isConnected };
}
