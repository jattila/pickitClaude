import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useKeyboardInset } from '../../../src/hooks/useKeyboardInset';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../src/utils/keyboardAvoiding';
import { useLists } from '../../../src/hooks/useLists';
import { useGroups } from '../../../src/hooks/useGroups';
import { useSharedLists } from '../../../src/hooks/useSharedLists';
import { useActiveShoppingList } from '../../../src/hooks/useActiveShoppingList';
import { useShareFlow } from '../../../src/hooks/useShareFlow';
import { unshareList } from '../../../src/services/sharing';
import { useItemsPanel } from '../../../src/hooks/useItemsPanel';
import { useAuthStore } from '../../../src/store/authStore';
import { useHadAccountHere } from '../../../src/hooks/useHadAccountHere';
import { useGuestSaveWarning } from '../../../src/hooks/useGuestSaveWarning';
import { useUiStore } from '../../../src/store/uiStore';
import { ListRow } from '../../../src/components/ListRow';
import { ItemRow } from '../../../src/components/ItemRow';
import { SectionHeaderRow } from '../../../src/components/SectionHeaderRow';
import { ItemNameInput } from '../../../src/components/ItemNameInput';
import { HomeTips } from '../../../src/components/HomeTips';
import { GuestNotice } from '../../../src/components/GuestNotice';
import { HeaderActionButton } from '../../../src/components/HeaderActionButton';
import { PromptDialog } from '../../../src/components/PromptDialog';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { HamburgerButton } from '../../../src/components/HamburgerButton';
import type { ShoppingList } from '../../../src/data/types';

export default function ListsOverviewScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { ref: keyboardRef, inset: keyboardInset } = useKeyboardInset();
  const user = useAuthStore((state) => state.user);
  const { lists: personalLists, loading, createList, renameList, deleteList } = useLists();
  const { groups } = useGroups();

  // Lists that reached me through a circle. Kept apart from `personalLists`
  // (which stays strictly private) so it stays obvious which are not mine alone.
  const sharedLists = useSharedLists(groups);

  // One list, no picker. Which one is decided by sharing and joining; changing
  // it deliberately lives in Beállítások, not here.
  const active = useActiveShoppingList(groups, personalLists, sharedLists);

  const {
    scrollViewRef,
    sections,
    scrollTargetId,
    handleTargetLayout,
    handleAdd,
    existingItemIds,
    recentPurchaseBanners,
    setRestoreRequest,
    setRenamingItem,
    setQuantityItem,
    toggleFavorite,
    setDeletingItem,
    clearCheckedRequest,
    checkedCount,
    checkItem,
    dialogs: itemDialogs,
  } = useItemsPanel(active.listId, active.ensureListId);

  const { requestShare, openGroup, dialogs: shareDialogs } = useShareFlow(groups);

  const hadAccountHere = useHadAccountHere();
  const guestRoute = hadAccountHere ? '/sign-in' : '/sign-up';

  // Set elsewhere — a migration finishing in a root hook, a sign-in or a join
  // completing on another screen — and shown here, because this is where the
  // person is looking afterwards.
  const justMigratedNotice = useUiStore((state) => state.justMigratedNotice);
  const setJustMigratedNotice = useUiStore((state) => state.setJustMigratedNotice);
  const localListKeptNotice = useUiStore((state) => state.localListKeptNotice);
  const setLocalListKeptNotice = useUiStore((state) => state.setLocalListKeptNotice);
  const joinedListNotice = useUiStore((state) => state.joinedListNotice);
  const setJoinedListNotice = useUiStore((state) => state.setJoinedListNotice);

  // Every list that gets a row: my private ones plus the occasional lists that
  // came through a circle. The active shopping list is excluded — its items are
  // shown in full below, so a row pointing at the same thing is a second door.
  const listRows: ShoppingList[] = [
    ...personalLists.filter((list) => list.id !== active.listId),
    ...sharedLists.filter((list) => list.id !== active.listId),
  ];

  // Content means an item *or* a list: both are something that would be lost,
  // so both are reason enough to say so.
  const guestWarning = useGuestSaveWarning(!user, sections.length > 0 || listRows.length > 0);

  const groupNameFor = (list: ShoppingList) =>
    list.groupId ? (groups.find((group) => group.id === list.groupId)?.name ?? 'Csoport') : null;

  const [creatingList, setCreatingList] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);
  const [unsharingList, setUnsharingList] = useState<ShoppingList | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: keyboardInset }]}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <Stack.Screen
        options={{
          // The active list's name, not the app's. With one list at a time and
          // the picker moved to Beállítások, this is the only thing on screen
          // saying which list an item is about to land on.
          title: active.name,
          headerLeft: () => <HamburgerButton />,
          headerRight: () =>
            user ? (
              <HeaderActionButton
                label="Megosztás"
                onPress={() => {
                  // Already shared: open the circle, where the members are.
                  if (active.groupId) {
                    openGroup(active.groupId);
                    return;
                  }
                  requestShare({
                    listId: active.listId,
                    ensureListId: active.ensureListId,
                    asMain: true,
                    listName: active.name,
                  });
                }}
              />
            ) : (
              // Registration by default: someone still using the app as a guest
              // usually has no account yet. Signing in stays reachable from the
              // menu, from Beállítások, and from a link on the sign-up screen.
              <HeaderActionButton
                label={hadAccountHere ? 'Belépés' : 'Regisztráció'}
                onPress={() => router.push(guestRoute)}
              />
            ),
        }}
      />

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {sections.length === 0 ? <HomeTips showInviteTip={groups.length === 0} /> : null}

        {/* One bar, two strengths. The offer stands for as long as someone uses
            the app as a guest; it hardens into a warning once there is an item
            or a list to lose, and steps back to the offer when that warning is
            acknowledged. Neither renders until the flag is read, so the screen
            never flips colour a moment after it appears. */}
        {guestWarning.showWarning ? (
          <GuestNotice
            mode="warning"
            hadAccountHere={hadAccountHere}
            onPress={() => router.push(guestRoute)}
            onDismiss={guestWarning.dismiss}
          />
        ) : guestWarning.showOffer ? (
          <GuestNotice
            mode="offer"
            hadAccountHere={hadAccountHere}
            onPress={() => router.push(guestRoute)}
          />
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderInline}>Listáim</Text>
          <Text style={styles.sectionAction} onPress={() => setCreatingList(true)}>
            + Új lista
          </Text>
        </View>
        {!loading &&
          listRows.map((item) => (
            <ListRow
              key={item.id}
              list={item}
              sharedWith={groupNameFor(item)}
              onPress={() => router.push(`/list/${item.id}`)}
              onRenameRequest={() => setRenamingList(item)}
              onDeleteRequest={() => setDeletingList(item)}
              onUnshareRequest={() => setUnsharingList(item)}
            />
          ))}

        {sections.length > 0 ? <SectionHeaderRow title="Bevásárlólista" /> : null}

        {sections.map((section) => (
          <Fragment key={section.title ?? 'active'}>
            {section.title ? (
              <SectionHeaderRow
                title={section.title}
                actionLabel={checkedCount > 0 ? 'Mind törlése' : undefined}
                onAction={clearCheckedRequest}
              />
            ) : null}
            {section.data.map((item) => (
              <View key={item.id} onLayout={item.id === scrollTargetId ? handleTargetLayout : undefined}>
                <ItemRow
                  item={item}
                  onCheck={() => checkItem(item.id)}
                  onRequestRestore={() => setRestoreRequest(item)}
                  onRenameRequest={() => setRenamingItem(item)}
                  onQuantityRequest={() => setQuantityItem(item)}
                  onToggleFavorite={() => toggleFavorite(item)}
                  onDeleteRequest={() => setDeletingItem(item)}
                />
              </View>
            ))}
          </Fragment>
        ))}
      </ScrollView>

      <View ref={keyboardRef} collapsable={false}>
        <ItemNameInput
          listId={active.listId}
          groupId={active.groupId}
          onSubmit={handleAdd}
          excludeIds={existingItemIds}
        />
      </View>

      {itemDialogs}
      {shareDialogs}

      <ConfirmDialog
        visible={justMigratedNotice}
        title="A listád a felhőbe került"
        message="Mostantól bármelyik telefonon eléred, ha bejelentkezel."
        confirmLabel="Értem"
        hideCancel
        onCancel={() => setJustMigratedNotice(false)}
        onConfirm={() => setJustMigratedNotice(false)}
      />

      <ConfirmDialog
        visible={localListKeptNotice}
        title="A telefonos listád megmarad"
        message="Most a fiókod listáit látod. Ami ezen a telefonon volt, az érintetlen marad, és kijelentkezés után újra előjön."
        confirmLabel="Értem"
        hideCancel
        onCancel={() => setLocalListKeptNotice(false)}
        onConfirm={() => setLocalListKeptNotice(false)}
      />

      {/* Joining repoints where everything you type lands. Saying so once is
          what keeps that from being discovered hours later. */}
      <ConfirmDialog
        visible={!!joinedListNotice}
        title="Új bevásárlólistád van"
        message={`Ezentúl a(z) "${joinedListNotice ?? ''}" listára írsz. A Beállításokban bármikor válthatsz a listáid között.`}
        confirmLabel="Értem"
        hideCancel
        onCancel={() => setJoinedListNotice(null)}
        onConfirm={() => setJoinedListNotice(null)}
      />

      <PromptDialog
        visible={creatingList}
        title="Új lista neve"
        capitalize
        placeholder="pl. Szülinapi buli"
        onCancel={() => setCreatingList(false)}
        onConfirm={async (name) => {
          await createList(name);
          setCreatingList(false);
        }}
      />

      <PromptDialog
        visible={!!renamingList}
        title="Lista átnevezése"
        capitalize
        initialValue={renamingList?.name ?? ''}
        onCancel={() => setRenamingList(null)}
        onConfirm={async (name) => {
          if (renamingList) await renameList(renamingList.id, name);
          setRenamingList(null);
        }}
      />

      <ConfirmDialog
        visible={!!deletingList}
        title="Lista törlése"
        message={
          deletingList && groupNameFor(deletingList)
            ? `Biztosan törlöd: "${deletingList?.name}"? Ez az összes tételt is törli, a(z) "${groupNameFor(deletingList)}" minden tagjánál.`
            : `Biztosan törlöd: "${deletingList?.name}"? Ez az összes tételt is törli.`
        }
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeletingList(null)}
        onConfirm={() => {
          if (deletingList) deleteList(deletingList.id);
          setDeletingList(null);
        }}
      />

      {/* The way back out of a share that doesn't destroy anything: the list
          becomes private again and keeps every item on it. */}
      <ConfirmDialog
        visible={!!unsharingList}
        title="Megosztás megszüntetése"
        message={`"${unsharingList?.name}" újra csak a tiéd lesz — a többi tag nem fogja látni. A tételek megmaradnak.`}
        confirmLabel="Megszüntetem"
        destructive
        onCancel={() => setUnsharingList(null)}
        onConfirm={() => {
          const list = unsharingList;
          setUnsharingList(null);
          if (list) {
            unshareList(list.id).catch((e: any) =>
              setActionError(e?.message ?? 'Nem sikerült megszüntetni a megosztást.')
            );
          }
        }}
      />

      <ConfirmDialog
        visible={!!actionError}
        title="Nem sikerült"
        message={actionError ?? ''}
        confirmLabel="Értem"
        hideCancel
        onCancel={() => setActionError(null)}
        onConfirm={() => setActionError(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // flex:1 so the scroll area absorbs the keyboard inset applied to the
  // container; without it RN's default flexShrink of 0 keeps the ScrollView at
  // full height and pushes the input row out of view instead of moving it up.
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  // Same look as a section header but without horizontal padding, because its
  // parent already provides the 20px inset — so the header text lines up with
  // the rows below instead of sitting further in.
  sectionHeaderInline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
  },
  sectionAction: {
    color: '#4A90D9',
    fontSize: 13,
    fontWeight: '600',
  },
});
