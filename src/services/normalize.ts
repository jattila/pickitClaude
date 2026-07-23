/**
 * Shared name normalization used by both the local (SQLite) and cloud (Firestore) repositories,
 * so that "only one entry per product" and catalog dedupe behave identically in both places.
 */

export function normalizeName(rawName: string): string {
  return rawName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (á -> a, ő -> o, ü -> u, ...)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function slugify(normalizedName: string): string {
  const slug = normalizedName
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return slug || 'item';
}

export function toItemId(rawName: string): { normalizedName: string; id: string } {
  const normalizedName = normalizeName(rawName);
  return { normalizedName, id: slugify(normalizedName) };
}
