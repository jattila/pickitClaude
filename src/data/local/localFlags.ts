import { getDb } from './db';

/**
 * Small yes/no facts about *this phone*, kept in the local `meta` table.
 *
 * That table is the only store that outlives both signing out and the
 * guest-to-account migration, which is exactly the lifetime these need: they
 * describe the device, not the account. They go away with the app, and with the
 * development reset — both of which are the right moment to forget them.
 */
export async function hasFlag(key: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value === '1';
}

export async function setFlag(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key]
  );
}
