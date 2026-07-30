import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();

/**
 * Caps how many instances any one function can scale to. This is a cost
 * backstop, not a performance tuning: a flood of writes (a runaway client, or
 * someone abusing the open sign-up to hammer Firestore) makes every item
 * trigger fire, and each fanned-out invocation does several more reads/writes.
 * Without a ceiling that secondary work scales with the attack; with one it is
 * bounded — the queue backs up instead of the bill.
 *
 * 10 is comfortably above real family-sized bursts (HTTPS callables handle ~80
 * concurrent requests per instance; event triggers run one at a time, so this
 * throttles trigger fan-out to 10 in flight). Set before any function is
 * defined so it applies to all of them — the re-exports below evaluate, and
 * register their triggers, only after this call.
 */
setGlobalOptions({ maxInstances: 10 });

export { createInvite } from './groups/createInvite';
export { redeemInvite } from './groups/redeemInvite';
export { getInvitePreview } from './groups/getInvitePreview';
export { setMemberSuspended } from './groups/setMemberSuspended';
export { leaveGroup } from './groups/leaveGroup';
export { backfillMemberEmails } from './groups/backfillMemberEmails';
export { onItemCreated } from './items/onItemCreated';
export { onItemUpdated } from './items/onItemUpdated';
export { onItemDeleted } from './items/onItemDeleted';
export { digestScheduler } from './digest/digestScheduler';
export { onUserSettingsUpdated } from './digest/onUserSettingsUpdated';
