/**
 * How long an invite code stays redeemable.
 *
 * Mirrors EXPIRES_IN_MS in functions/src/groups/createInvite.ts. The server is
 * what enforces it; this copy only words the invite message and decides when a
 * code remembered on the phone is too old to bother reopening.
 */
export const INVITE_VALID_DAYS = 7;
