import { useEffect, useState } from 'react';
import { hasAccountHistory } from '../data/local/accountHistory';

/**
 * Whether this phone has had an account signed in on it before.
 *
 * Decides whether a guest is offered registration or sign-in. Someone who
 * registered here and later signed out already has their list in the cloud, and
 * telling them to register again would send them to make a second account.
 *
 * Starts false, so the default is the offer that is safe for a stranger: sign-up.
 */
export function useHadAccountHere(): boolean {
  const [had, setHad] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasAccountHistory()
      .then((value) => {
        if (!cancelled) setHad(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return had;
}
