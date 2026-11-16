/**
 * How long an invite code stays redeemable.
 *
 * Mirrors EXPIRES_IN_MS in functions/src/groups/createInvite.ts. The server is
 * what enforces it; this copy only words the invite message and decides when a
 * code remembered on the phone is too old to bother reopening.
 */
export const INVITE_VALID_DAYS = 7;

/**
 * Where someone without the app can get it, quoted in the invite message.
 *
 * Kept here in code rather than in app.json on purpose: the app config feeds
 * the build fingerprint, so changing a link there would demand new native
 * builds, while here it ships as an ordinary update.
 *
 * An empty string leaves that line out of the message. During the test phase
 * these are the TestFlight public link and the Play internal-testing opt-in
 * link — and the Play one only works for Google accounts already on the tester
 * list, so adding the invitee there remains a separate step.
 */
export const DOWNLOAD_LINKS: { ios: string; android: string } = {
  ios: '',
  android: '',
};
