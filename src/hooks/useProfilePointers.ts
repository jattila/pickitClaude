import { useEffect, useState } from 'react';
import { doc, type DocumentData } from '@react-native-firebase/firestore';
import { firestore } from '../services/firebase';
import { watchDoc } from '../services/firestoreWatch';
import { useAuthStore } from '../store/authStore';

export interface ProfilePointers {
  /** The shopping list the home screen writes into — may be a shared one. */
  defaultListId: string | null;
  /**
   * The account's own private shopping list, which sharing never moves.
   *
   * Kept apart from `defaultListId` because the two stopped being the same
   * thing: once you share your list or join someone else's, the active pointer
   * moves and the private list becomes indistinguishable from any other list
   * you happen to own. Without this, switching back to it in Beállítások would
   * be impossible.
   */
  personalListId: string | null;
}

const NONE: ProfilePointers = { defaultListId: null, personalListId: null };

/** Live, so switching lists in Beállítások redraws the home screen at once. */
export function useProfilePointers(): ProfilePointers {
  const user = useAuthStore((state) => state.user);
  const [pointers, setPointers] = useState<ProfilePointers>(NONE);

  useEffect(() => {
    if (!user) {
      setPointers(NONE);
      return;
    }
    return watchDoc(
      doc(firestore, 'users', user.uid),
      (snap) => {
        const data = snap.data() as DocumentData | undefined;
        return {
          defaultListId: data?.defaultListId ?? null,
          personalListId: data?.personalListId ?? null,
        };
      },
      setPointers,
      NONE
    );
  }, [user]);

  return pointers;
}
