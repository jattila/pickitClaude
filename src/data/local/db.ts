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

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('pickit-guest.db').then(async (db) => {
      await db.execAsync(SCHEMA);
      return db;
    });
  }
  return dbPromise;
}
