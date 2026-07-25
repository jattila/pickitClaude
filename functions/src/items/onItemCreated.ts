import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { catalogDocForList } from './catalogPath';
import { recordPendingChange } from '../digest/pendingChanges';

export const onItemCreated = onDocumentCreated('lists/{listId}/items/{itemId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const item = snap.data();
  const { listId, itemId } = event.params as { listId: string; itemId: string };
  const db = getFirestore();

  const listRef = db.collection('lists').doc(listId);
  const listSnap = await listRef.get();
  if (!listSnap.exists) return;
  const list = listSnap.data()!;

  const now = Date.now();

  // Upsert the catalog entry (dedupe by item id = normalized-name slug).
  const catalogRef = catalogDocForList(list, itemId);
  const catalogSnap = await catalogRef.get();
  if (catalogSnap.exists) {
    await catalogRef.update({
      name: item.name,
      normalizedName: item.normalizedName,
      usageCount: FieldValue.increment(1),
      lastUsedAt: now,
    });
  } else {
    await catalogRef.set({
      name: item.name,
      normalizedName: item.normalizedName,
      usageCount: 1,
      lastUsedAt: now,
      createdAt: now,
    });
  }

  // Maintain the list's denormalized counters (unchecked by default on create).
  const counterField = item.checked === true ? 'boughtItemCount' : 'activeItemCount';
  await listRef.update({
    lastActivityAt: now,
    [counterField]: FieldValue.increment(1),
  });

  await recordPendingChange(list, listId, item.addedBy, 'added', item.name);
});
