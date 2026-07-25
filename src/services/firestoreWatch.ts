import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from '@react-native-firebase/firestore';

/**
 * onSnapshot wrappers that survive losing access to what they're watching.
 *
 * Signing out (or being suspended from a group) revokes permission while the
 * listeners are still attached. React Native Firebase then invokes the
 * callback with a null snapshot, so reading `.docs` off it throws and takes
 * the screen down. Both paths — a null snapshot and a real error — are
 * funnelled into the caller's fallback value instead.
 */
export function watchQuery<T>(
  query: Query<DocumentData>,
  toValue: (snap: QuerySnapshot<DocumentData>) => T,
  onChange: (value: T) => void,
  fallback: T
): () => void {
  return onSnapshot(
    query,
    (snap) => onChange(snap ? toValue(snap) : fallback),
    () => onChange(fallback)
  );
}

export function watchDoc<T>(
  ref: DocumentReference<DocumentData>,
  toValue: (snap: DocumentSnapshot<DocumentData>) => T,
  onChange: (value: T) => void,
  fallback: T
): () => void {
  return onSnapshot(
    ref,
    (snap) => onChange(snap ? toValue(snap) : fallback),
    () => onChange(fallback)
  );
}
