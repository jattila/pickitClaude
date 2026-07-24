import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const onItemDeleted = onDocumentDeleted('lists/{listId}/items/{itemId}', async (event) => {
  const item = event.data?.data();
  if (!item) return;
  const { listId } = event.params as { listId: string };
  const db = getFirestore();
  const now = Date.now();

  // The catalog entry is intentionally kept as product history — only the
  // list's denormalized counter is decremented.
  const counterField = item.checked === true ? 'boughtItemCount' : 'activeItemCount';
  await db
    .collection('lists')
    .doc(listId)
    .update({
      lastActivityAt: now,
      [counterField]: FieldValue.increment(-1),
    })
    .catch(() => {
      // List was deleted alongside its items (cascade) — nothing to update.
    });
});
