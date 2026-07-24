import { getFirestore, DocumentReference } from 'firebase-admin/firestore';

/**
 * A list's catalog lives with its scope so catalogs never mix: group lists feed
 * the shared group catalog, personal lists feed the owner's personal catalog.
 * The catalog entry id mirrors the item's id (the slug of its normalized name),
 * which gives free dedupe across re-adds of the same product.
 */
export function catalogDocForList(
  list: FirebaseFirestore.DocumentData,
  itemId: string
): DocumentReference {
  const db = getFirestore();
  return list.groupId
    ? db.collection('groups').doc(list.groupId).collection('catalog').doc(itemId)
    : db.collection('users').doc(list.ownerId).collection('catalog').doc(itemId);
}
