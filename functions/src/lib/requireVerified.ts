import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

/**
 * The callable equivalent of the `isSignedIn()` check in firestore.rules.
 * Callables run with the Admin SDK, which bypasses security rules entirely —
 * without this, every rule we tightened would still have an open side door.
 *
 * Returns the caller's uid so the call sites read as one line.
 */
export function requireVerifiedUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Be kell jelentkezni.');
  if (request.auth?.token?.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Előbb erősítsd meg az e-mail címedet.');
  }
  return uid;
}
