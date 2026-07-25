/**
 * The "Katalógus" nav entry (hamburger menu, bottom tab) must not always land
 * on the personal catalog — while browsing a group, it should go to *that*
 * group's catalog instead, since group and personal catalogs are separate.
 */
export function resolveCatalogPath(pathname: string): string {
  const match = pathname.match(/^\/group\/([^/]+)/);
  return match ? `/group/${match[1]}/catalog` : '/catalog';
}
