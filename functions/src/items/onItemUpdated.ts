import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { catalogDocForList } from './catalogPath';

export const onItemUpdated = onDocumentUpdated('lists/{listId}/items/{itemId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  const { listId, itemId } = event.params as { listId: string; itemId: string };
  const db = getFirestore();
  const listRef = db.collection('lists').doc(listId);
  const now = Date.now();

  const updates: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = { lastActivityAt: now };

  // checked toggled — move the item between the active/bought counters.
  if (before.checked !== after.checked) {
    if (after.checked) {
      updates.activeItemCount = FieldValue.increment(-1);
      updates.boughtItemCount = FieldValue.increment(1);
    } else {
      updates.activeItemCount = FieldValue.increment(1);
      updates.boughtItemCount = FieldValue.increment(-1);
    }
  }
  await listRef.update(updates);

  // In-place rename (same id, changed casing/name) — refresh the catalog label.
  if (before.name !== after.name) {
    const listSnap = await listRef.get();
    if (listSnap.exists) {
      await catalogDocForList(listSnap.data()!, itemId).set(
        { name: after.name, normalizedName: after.normalizedName, lastUsedAt: now },
        { merge: true }
      );
    }
  }
});
