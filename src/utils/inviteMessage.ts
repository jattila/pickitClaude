import Constants from 'expo-constants';
import { INVITE_VALID_DAYS } from '../config/invites';

/**
 * The link that opens this invite.
 *
 * An https link on the invite website (`extra.inviteBaseUrl`, set per build
 * variant in app.config.ts): with the app installed the OS hands it to the app,
 * otherwise it opens a page with the code and where to get the app.
 *
 * The custom scheme is only the fallback for a binary built before the website
 * existed. It is read from the running app's own config so that a development
 * build (`pickit-dev://`) never produces a link that opens the tester app.
 */
export function inviteLink(code: string): string {
  const base = Constants.expoConfig?.extra?.inviteBaseUrl;
  if (typeof base === 'string' && base) return `${base}/${code}`;

  const scheme = Constants.expoConfig?.scheme;
  const name = Array.isArray(scheme) ? scheme[0] : scheme;
  return `${name ?? 'pickit'}://join/${code}`;
}

/**
 * The invite code inside a link that opened the app — https or custom scheme,
 * /join/ or /dev/join/ — if it was an invite link at all.
 */
export function inviteCodeFromUrl(url: string): string | null {
  const match = /(?:^|[/:])join\/([A-Za-z0-9]+)/.exec(url);
  return match ? match[1].toUpperCase() : null;
}

/**
 * What someone typed into "join with a code": the code itself, or the whole
 * link pasted from the message, which is the easier thing to copy.
 */
export function inviteCodeFromInput(input: string): string {
  return inviteCodeFromUrl(input) ?? input.trim().toUpperCase();
}

/**
 * The text handed to the share sheet.
 *
 * Written for someone who may have nothing yet — no app, no account — because
 * that is who most invitees are. The one link covers both cases; the code is
 * still spelled out with the path to type it in, for the rare phone where the
 * link opens the browser even though the app is there.
 */
export function buildInviteMessage(groupName: string, code: string): string {
  return [
    `Csatlakozz a(z) "${groupName}" csoporthoz a PickIt appban!`,
    '',
    'Nyisd meg ezt a linket:',
    inviteLink(code),
    '',
    'Ha megvan az app, a link abban nyílik meg. Ha még nincs, a megnyíló oldalon megtalálod, honnan töltheted le.',
    '',
    `Ha a link mégsem az appot nyitja meg, az appban: Beállítások → Csatlakozás meghívó kóddal → ${code}`,
    '',
    `A csatlakozáshoz fiók kell, ezt az appban tudod létrehozni. A meghívó ${INVITE_VALID_DAYS} napig érvényes.`,
  ].join('\n');
}
