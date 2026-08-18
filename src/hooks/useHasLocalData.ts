import { useEffect, useState } from 'react';
import { hasLocalData } from '../services/migration';

/**
 * Whether this phone is still holding a guest list.
 *
 * Screens use it to word themselves honestly: "your list will move to the
 * cloud" is reassuring to someone who has one and confusing noise to someone
 * who just installed the app. Starts false, so nothing is promised before the
 * answer is known.
 */
export function useHasLocalData(): boolean {
  const [present, setPresent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasLocalData()
      .then((value) => {
        if (!cancelled) setPresent(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return present;
}
