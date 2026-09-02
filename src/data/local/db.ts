import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT NOT NULL,
  listId TEXT NOT NULL,
  name TEXT NOT NULL,
  normalizedName TEXT NOT NULL,
  quantity TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  checked INTEGER NOT NULL DEFAULT 0,
  checkedByName TEXT,
  checkedAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  PRIMARY KEY (listId, id)
);

CREATE TABLE IF NOT EXISTS catalog (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  normalizedName TEXT NOT NULL,
  usageCount INTEGER NOT NULL DEFAULT 0,
  lastUsedAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

/**
 * Columns added after the first release. The SCHEMA above only runs as CREATE
 * TABLE IF NOT EXISTS, so it never touches a database that already exists —
 * without this, an upgrading guest would keep the old table and every query
 * touching the new column would fail.
 */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: 'items', column: 'favorite', definition: 'INTEGER NOT NULL DEFAULT 0' },
];

async function applyColumnMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (columns.some((c) => c.name === column)) continue;
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export const GUEST_DB_NAME = 'pickit-guest.db';

/**
 * Closes the open handle and forgets it, so the file can be deleted.
 *
 * Only the development reset needs this: SQLite will not remove a database
 * anything still holds open, and the module-level promise would otherwise hand
 * out a handle to a file that no longer exists.
 */
export async function closeDb(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) return;
  await pending.then((db) => db.closeAsync()).catch(() => undefined);
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(GUEST_DB_NAME).then(async (db) => {
      await db.execAsync(SCHEMA);
      await applyColumnMigrations(db);
      return db;
    });
  }
  return dbPromise;
}
