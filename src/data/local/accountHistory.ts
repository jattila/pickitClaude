import { getDb } from './db';

const KEY = 'hadAccountHere';

/**
 * Whether an account has ever been signed in on this phone.
 *
 * Kept in the local `meta` table because that is the only store that outlives a
 * sign-out: signing out does not touch the local database at all, and the
 * guest-data migration clears only the `defaultListId` key. It is lost when the
 * app is deleted or its data cleared, which is the right scope — that is a phone
 * with no history on it again.
 *
 * Note what this does and does not say. It is a fact about the *device*, not
 * about the person holding it: on a phone two people share, the second one is
 * also told an account has been here. Anything shown because of this should
 * therefore talk about the phone, never about "you".
 */
export async function markAccountUsedHere(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [KEY]
  );
}

export async function hasAccountHistory(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [KEY]);
  return row?.value === '1';
}
