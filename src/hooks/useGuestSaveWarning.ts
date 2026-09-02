import { useCallback, useEffect, useState } from 'react';
import { hasFlag, setFlag } from '../data/local/localFlags';

export const GUEST_WARNING_KEY = 'guestSaveWarningDismissed';

/**
 * Whether to warn a guest that what they are writing stays on this phone.
 *
 * Derived from state rather than from an event: it shows whenever there is
 * something to lose and the warning has not been closed. Nothing has to report
 * "an item was just added", and the bar survives an app restart — which is what
 * makes "it stays until you close it, then never again" actually true.
 *
 * `ready` exists so the screen can show neither bar until the flag is known.
 * Without it the blue offer would render first and flip to amber a moment later,
 * which reads as a glitch rather than as a decision.
 *
 * The flag lives in the local `meta` table, so it outlives signing out and is
 * cleared only by the development reset or by deleting the app.
 */
export function useGuestSaveWarning(isGuest: boolean, hasContent: boolean) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hasFlag(GUEST_WARNING_KEY)
      .then(setDismissed)
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setFlag(GUEST_WARNING_KEY).catch(() => undefined);
  }, []);

  return {
    ready,
    /** The amber bar: something to lose, and nobody has acknowledged it yet. */
    showWarning: ready && isGuest && hasContent && !dismissed,
    /** The blue bar: everything else a guest sees, including after dismissing. */
    showOffer: ready && isGuest && !(hasContent && !dismissed),
    dismiss,
  };
}
