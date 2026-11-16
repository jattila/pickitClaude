import Constants from 'expo-constants';
import { DOWNLOAD_LINKS, INVITE_VALID_DAYS } from '../config/invites';

/**
 * The deep link that opens this invite, in whichever variant of the app is
 * sending it.
 *
 * The scheme used to be written out as `pickit://`, which is the released app's.
 * The development build registers `pickit-dev://` instead, so an invite created
 * while testing opened the *tester* app on a phone that had both — or nothing at
 * all on a phone that had neither. Reading it from the running app's own config
 * keeps the link pointing at the app that produced it.
 */
export function inviteLink(code: string): string {
  const scheme = Constants.expoConfig?.scheme;
  const name = Array.isArray(scheme) ? scheme[0] : scheme;
  return `${name ?? 'pickit'}://join/${code}`;
}

/** The invite code inside a link that opened the app, if it was an invite link at all. */
export function inviteCodeFromUrl(url: string): string | null {
  const match = /(?:^|[/:])join\/([A-Za-z0-9]+)/.exec(url);
  return match ? match[1].toUpperCase() : null;
}

/**
 * The text handed to the share sheet.
 *
 * Written for someone who may have nothing yet — no app, no account — because
 * that is who most invitees are. The code is spelled out with the path to type
 * it in, since most messengers only make https links tappable and leave a
 * `pickit://` one as plain text.
 */
export function buildInviteMessage(groupName: string, code: string): string {
  const lines = [
    `Csatlakozz a(z) "${groupName}" csoporthoz a PickIt appban!`,
    '',
    'Ha megvan az app, nyisd meg ezt a linket:',
    inviteLink(code),
    '',
    `Ha a link nem nyílik meg, az appban: Beállítások → Csatlakozás meghívó kóddal → ${code}`,
  ];

  const downloads = [
    DOWNLOAD_LINKS.ios ? `iPhone: ${DOWNLOAD_LINKS.ios}` : null,
    DOWNLOAD_LINKS.android ? `Android: ${DOWNLOAD_LINKS.android}` : null,
  ].filter((line): line is string => line !== null);
  if (downloads.length > 0) {
    lines.push('', 'Ha még nincs meg az app, innen töltheted le:', ...downloads);
  }

  lines.push(
    '',
    `A csatlakozáshoz fiók kell, ezt az appban tudod létrehozni. A meghívó ${INVITE_VALID_DAYS} napig érvényes.`
  );
  return lines.join('\n');
}
