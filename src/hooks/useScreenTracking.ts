import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { logScreen } from '../services/analytics';

/**
 * Reports every screen the user opens, once per navigation. Mounted from the
 * root layout so it covers the whole app, including the tab and group routes.
 *
 * Daily and monthly active users come from the SDK on its own — this only adds
 * *which* parts of the app get used, which is the part that actually informs
 * what to build next.
 */
export function useScreenTracking(): void {
  const pathname = usePathname();
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    // expo-router re-renders on params and state changes too; without this the
    // same screen would be counted several times per visit.
    if (!pathname || pathname === lastReported.current) return;
    lastReported.current = pathname;
    logScreen(pathname);
  }, [pathname]);
}
