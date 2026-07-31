import { getAnalytics, logScreenView } from '@react-native-firebase/analytics';
import { firebaseApp } from './firebase';

export const analytics = getAnalytics(firebaseApp);

/**
 * Screen names are an event *parameter*, and Analytics only keeps a bounded
 * number of distinct values per parameter before it starts dropping the rest.
 * Raw router paths would blow that budget instantly — every list and group id
 * a user ever opens would count as its own screen — and the useful signal
 * ("how many people open a list") would drown in noise.
 *
 * So ids are collapsed back to their route shape: /list/abc123 -> /list/[id].
 */
function toScreenName(pathname: string): string {
  return pathname
    .replace(/\/list\/[^/]+/, '/list/[id]')
    .replace(/\/group\/[^/]+/, '/group/[id]')
    .replace(/\/join\/[^/]+/, '/join/[code]');
}

/**
 * Reports a screen view. Nothing user-generated is ever passed in — no list or
 * item names, no email addresses — only the route shape, which is what the
 * usage numbers are actually about.
 */
export async function logScreen(pathname: string): Promise<void> {
  const screenName = toScreenName(pathname);
  await logScreenView(analytics, {
    screen_name: screenName,
    screen_class: screenName,
  }).catch(() => undefined);
}
