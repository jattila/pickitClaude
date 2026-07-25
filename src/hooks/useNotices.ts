import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  type DocumentData,
} from '@react-native-firebase/firestore';
import { firestore } from '../services/firebase';
import { watchQuery } from '../services/firestoreWatch';
import { useAuthStore } from '../store/authStore';

export interface Notice {
  id: string;
  type: 'group-suspended' | 'group-reinstated';
  groupName: string;
  ownerEmail: string | null;
  ownerName: string;
  createdAt: number;
}

/**
 * One-off messages the server leaves for this user under users/{uid}/notices.
 * They live there rather than on the group because a suspended member is out
 * of the group's memberIds and can't read anything under it any more.
 *
 * Dismissing deletes the document, so a notice is shown once and never again.
 */
export function useNotices() {
  const uid = useAuthStore((state) => state.user?.uid);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!uid) {
      setNotices([]);
      return;
    }
    const q = query(
      collection(firestore, 'users', uid, 'notices'),
      orderBy('createdAt', 'asc')
    );
    return watchQuery(
      q,
      (snap) =>
        snap.docs.map((d) => {
          const data = d.data() as DocumentData;
          return {
            id: d.id,
            type: data.type,
            groupName: data.groupName ?? '',
            ownerEmail: data.ownerEmail ?? null,
            ownerName: data.ownerName ?? '',
            createdAt: data.createdAt ?? 0,
          } as Notice;
        }),
      setNotices,
      []
    );
  }, [uid]);

  const dismiss = async (noticeId: string) => {
    if (!uid) return;
    await deleteDoc(doc(firestore, 'users', uid, 'notices', noticeId)).catch(() => undefined);
  };

  return { notices, dismiss };
}
