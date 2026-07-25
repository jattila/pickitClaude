/**
 * Whether the user currently has the app open, per the expiry timestamp their
 * client publishes (see usePresence). Missing or stale means away — the safe
 * default, since it only ever means we notify someone who might already have
 * seen the change, never that we stay silent when we shouldn't.
 */
export function isUserPresent(
  userData: FirebaseFirestore.DocumentData | undefined,
  now: number
): boolean {
  return typeof userData?.activeUntil === 'number' && userData.activeUntil > now;
}
