import { getDb } from './db';
import { INVITE_VALID_DAYS } from '../../config/invites';

const KEY = 'pendingInvite';
const MAX_AGE_MS = INVITE_VALID_DAYS * 24 * 60 * 60 * 1000;

/**
 * An invite opened before there was an account to join it with.
 *
 * Joining needs a verified account, and getting one means leaving the app for
 * the mailbox — by the time the person is back, the message that brought them
 * here is several apps away. Kept in the local `meta` table rather than in
 * memory because iOS often kills the app while the mail app is in front.
 *
 * On a phone two people share, the next person to sign in is the one who gets
 * it. That is acceptable only because the join screen it reopens still asks
 * before joining anything.
 */
export async function rememberPendingInvite(code: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [KEY, JSON.stringify({ code: code.toUpperCase(), savedAt: Date.now() })]
  );
}

/**
 * Hands the remembered code over once and forgets it. Null when there is none,
 * or when it is older than the invite itself could still be valid.
 */
export async function takePendingInvite(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [KEY]);
  if (!row) return null;
  await db.runAsync('DELETE FROM meta WHERE key = ?', [KEY]);
  try {
    const { code, savedAt } = JSON.parse(row.value) as { code?: unknown; savedAt?: unknown };
    if (typeof code !== 'string' || typeof savedAt !== 'number') return null;
    return Date.now() - savedAt <= MAX_AGE_MS ? code : null;
  } catch {
    return null;
  }
}
