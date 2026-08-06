import { useState } from 'react';
import { useRouter } from 'expo-router';
import { shareList } from '../services/sharing';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuthStore } from '../store/authStore';
import { PromptDialog } from '../components/PromptDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * What is about to be shared. `listId` may be null for the home screen's own
 * list, which does not exist until the first item is added — `ensureListId`
 * creates it at that point, so opening the app still writes nothing.
 */
export interface ShareTarget {
  listId: string | null;
  ensureListId?: () => Promise<string>;
  /** True for the whole shopping list, false for one list among the others. */
  asMain: boolean;
  /** Named in the prompt, so it is obvious what is being handed over. */
  what: string;
}

/**
 * The one path into sharing, used by both the home screen's header button and
 * the swipe action on a list row.
 *
 * Both need the same three refusals before anything happens — signed out,
 * offline, nothing to share — and getting those wrong is how a share silently
 * does nothing. Keeping them here means the two entry points cannot drift.
 */
export function useShareFlow() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const user = useAuthStore((state) => state.user);

  const [target, setTarget] = useState<ShareTarget | null>(null);
  // `needsAccount` turns the dialog from something you acknowledge into
  // something you act on: the refusal is only useful if the way past it is on
  // the same screen.
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
    needsAccount?: boolean;
  } | null>(null);

  /** Opens the group a list is shared with. */
  const openGroup = (groupId: string) => router.push(`/group/${groupId}`);

  const requestShare = (next: ShareTarget) => {
    if (!user) {
      setNotice({
        title: 'Ehhez be kell jelentkezned',
        message:
          'A megosztáshoz fiók kell, mert a többiek azon keresztül érik el a listát. A mostani listáid és tételeid megmaradnak.',
        needsAccount: true,
      });
      return;
    }
    if (!isConnected) {
      setNotice({
        title: 'Nincs internetkapcsolat',
        message: 'A megosztáshoz kapcsolat kell. Próbáld újra, ha van interneted.',
      });
      return;
    }
    setTarget(next);
  };

  // Errors are thrown on, not swallowed: PromptDialog catches them and shows
  // the message in the dialog, so a failed share stays visible instead of
  // closing as though it had worked.
  const confirmShare = async (groupName: string) => {
    if (!target) return;
    const listId = target.listId ?? (await target.ensureListId?.()) ?? null;
    if (!listId) throw new Error('Ez a lista még üres — vegyél fel rá valamit, mielőtt megosztod.');

    const { groupId } = await shareList(listId, groupName, target.asMain);
    setTarget(null);
    // Lands on the group itself rather than its member list: what you just made
    // is the group, and seeing it is the confirmation that the share worked.
    // Inviting people is one tap further, from the group's own Megosztás button.
    openGroup(groupId);
  };

  const dialogs = (
    <>
      <PromptDialog
        visible={!!target}
        title="Kivel osztod meg?"
        message={`Adj nevet a körnek, akikkel megosztod: ${target?.what ?? ''}. Ezen a néven fogják látni a többiek is.`}
        placeholder="pl. Kovács Család"
        confirmLabel="Megosztás"
        onCancel={() => setTarget(null)}
        onConfirm={confirmShare}
      />

      <ConfirmDialog
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel={notice?.needsAccount ? 'Regisztráció' : 'Értem'}
        secondaryLabel={notice?.needsAccount ? 'Belépés' : undefined}
        filledActions={notice?.needsAccount}
        onSecondary={() => {
          setNotice(null);
          router.push('/sign-in');
        }}
        // The offline notice has nothing to do but be acknowledged; the account
        // one is a choice, so it keeps a way to back out of it.
        hideCancel={!notice?.needsAccount}
        onCancel={() => setNotice(null)}
        onConfirm={() => {
          const needsAccount = notice?.needsAccount;
          setNotice(null);
          if (needsAccount) router.push('/sign-up');
        }}
      />
    </>
  );

  return { requestShare, openGroup, dialogs };
}
