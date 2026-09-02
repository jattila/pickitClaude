import { useState } from 'react';
import { useRouter } from 'expo-router';
import { shareList } from '../services/sharing';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuthStore } from '../store/authStore';
import { PromptDialog } from '../components/PromptDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PickerDialog } from '../components/PickerDialog';
import type { Group } from '../data/types';

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
  /** The list's current name, used to label the "new circle" option. */
  listName: string;
}

const NEW_CIRCLE = '__new__';

/**
 * The one path into sharing, used by the home screen's header button and by the
 * list detail screen.
 *
 * The circle is never named separately — it takes the list's name. An occasional
 * list already has one worth using, so sharing it asks nothing at all unless
 * there are existing circles to choose from. The whole shopping list is the
 * exception: "Bevásárlólista" says nothing about who it is for, so that one
 * asks for a name, and the answer renames the list itself.
 */
export function useShareFlow(groups: Group[]) {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const user = useAuthStore((state) => state.user);

  const [naming, setNaming] = useState<ShareTarget | null>(null);
  const [picking, setPicking] = useState<ShareTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `needsAccount` turns the dialog from something you acknowledge into
  // something you act on: the refusal is only useful if the way past it is on
  // the same screen.
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
    needsAccount?: boolean;
  } | null>(null);

  /** Opens the circle a list is shared with. */
  const openGroup = (groupId: string) => router.push(`/group/${groupId}`);

  /**
   * Where a *newly created* circle lands: straight on the member list with the
   * address prompt already open. A circle with nobody in it is a shared list
   * shared with no one, so inviting is not a separate errand — it is the second
   * half of the same action.
   */
  const openNewCircle = (groupId: string) =>
    router.push(`/group/${groupId}/members?invite=1`);

  const resolveListId = async (target: ShareTarget) => {
    const listId = target.listId ?? (await target.ensureListId?.()) ?? null;
    if (!listId) throw new Error('Ez a lista még üres — vegyél fel rá valamit, mielőtt megosztod.');
    return listId;
  };

  const requestShare = (target: ShareTarget) => {
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

    if (target.asMain) {
      setNaming(target);
      return;
    }
    // An occasional list with nobody to hand it to needs no dialog at all: the
    // list has a name, and that name becomes the circle's.
    if (groups.length === 0) {
      shareNow(target).catch((e: any) => setError(e?.message ?? 'Nem sikerült megosztani.'));
      return;
    }
    setPicking(target);
  };

  const shareNow = async (target: ShareTarget, existingGroupId?: string) => {
    const listId = await resolveListId(target);
    const { groupId } = await shareList(listId, { asMain: target.asMain, existingGroupId });
    // An existing circle already has its people; only a fresh one needs someone
    // invited into it right away.
    if (existingGroupId) openGroup(groupId);
    else openNewCircle(groupId);
  };

  // Thrown on, not swallowed: PromptDialog catches it and shows the message
  // inside the dialog, so a failed share stays visible instead of closing as
  // though it had worked.
  const confirmName = async (newName: string) => {
    if (!naming) return;
    const listId = await resolveListId(naming);
    const { groupId } = await shareList(listId, { asMain: true, newName });
    setNaming(null);
    openNewCircle(groupId);
  };

  const dialogs = (
    <>
      <PromptDialog
        visible={!!naming}
        title="Adj nevet a listának"
        capitalize
        message="Ezen a néven látják a többiek is, és ez jelenik meg a fejlécben."
        placeholder="pl. Kovács Család"
        confirmLabel="Megosztás"
        onCancel={() => setNaming(null)}
        onConfirm={confirmName}
      />

      <PickerDialog
        visible={!!picking}
        title="Kivel osztod meg?"
        message={`"${picking?.listName ?? ''}" — válassz egy meglévő kört, vagy hozz létre újat.`}
        options={[
          { key: NEW_CIRCLE, label: `Új kör: "${picking?.listName ?? ''}"` },
          ...groups.map((group) => ({
            key: group.id,
            label: group.name,
            hint: `${group.memberIds.length} tag`,
          })),
        ]}
        onCancel={() => setPicking(null)}
        onSelect={(key) => {
          const target = picking;
          setPicking(null);
          if (!target) return;
          shareNow(target, key === NEW_CIRCLE ? undefined : key).catch((e: any) =>
            setError(e?.message ?? 'Nem sikerült megosztani.')
          );
        }}
      />

      <ConfirmDialog
        visible={!!error}
        title="Nem sikerült megosztani"
        message={error ?? ''}
        confirmLabel="Értem"
        hideCancel
        onCancel={() => setError(null)}
        onConfirm={() => setError(null)}
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
