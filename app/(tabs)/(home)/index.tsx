import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useKeyboardInset } from '../../../src/hooks/useKeyboardInset';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../src/utils/keyboardAvoiding';
import { useLists } from '../../../src/hooks/useLists';
import { useGroups } from '../../../src/hooks/useGroups';
import { useSharedLists } from '../../../src/hooks/useSharedLists';
import { useHomeScopes, PERSONAL_SCOPE } from '../../../src/hooks/useHomeScopes';
import { useShareFlow } from '../../../src/hooks/useShareFlow';
import { leaveGroup } from '../../../src/services/groups';
import { unshareList } from '../../../src/services/sharing';
import { useDefaultList } from '../../../src/hooks/useQuickAdd';
import { useItemsPanel } from '../../../src/hooks/useItemsPanel';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { useAuthStore } from '../../../src/store/authStore';
import { useHadAccountHere } from '../../../src/hooks/useHadAccountHere';
import { useUiStore } from '../../../src/store/uiStore';
import { ListRow } from '../../../src/components/ListRow';
import { GroupRow } from '../../../src/components/GroupRow';
import { ItemRow } from '../../../src/components/ItemRow';
import { SectionHeaderRow } from '../../../src/components/SectionHeaderRow';
import { ItemNameInput } from '../../../src/components/ItemNameInput';
import { ScopeSelector } from '../../../src/components/ScopeSelector';
import { HomeTips } from '../../../src/components/HomeTips';
import { GuestListNotices } from '../../../src/components/GuestListNotices';
import { HeaderActionButton } from '../../../src/components/HeaderActionButton';
import { PromptDialog } from '../../../src/components/PromptDialog';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { HamburgerButton } from '../../../src/components/HamburgerButton';
import type { Group, ShoppingList } from '../../../src/data/types';

export default function ListsOverviewScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { ref: keyboardRef, inset: keyboardInset } = useKeyboardInset();
  const { isConnected } = useNetworkStatus();
  const user = useAuthStore((state) => state.user);
  const { listId: personalListId, ensureListId: ensurePersonalListId } = useDefaultList();
  const { lists: allLists, loading, createList, renameList, deleteList } = useLists();
  const { groups, createGroup, renameGroup, deleteGroup } = useGroups();

  // Lists that reached me through a group. Kept apart from `allLists` (which
  // stays strictly personal) so it stays obvious which ones are not mine alone.
  const sharedLists = useSharedLists(groups);
  const { scopes, selected, select, listIdsInScopes } = useHomeScopes(
    groups,
    sharedLists,
    personalListId,
    ensurePersonalListId
  );

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
  } = useItemsPanel(selected.listId, selected.ensureListId);

  const { requestShare, openGroup, dialogs: shareDialogs } = useShareFlow();

  // A phone that has had an account on it before is almost certainly the same
  // person coming back, and their list is already in the cloud — offering them
  // registration would send them to open a second account beside it.
  const hadAccountHere = useHadAccountHere();
  const guestRoute = hadAccountHere ? '/sign-in' : '/sign-up';

  // Both are set elsewhere — a migration finishing in a root hook, a sign-in
  // completing on another screen — and land here because this is where the
  // person is looking afterwards.
  const justMigratedNotice = useUiStore((state) => state.justMigratedNotice);
  const setJustMigratedNotice = useUiStore((state) => state.setJustMigratedNotice);
  const localListKeptNotice = useUiStore((state) => state.localListKeptNotice);
  const setLocalListKeptNotice = useUiStore((state) => state.setLocalListKeptNotice);

  // Every list that has a row of its own: my private ones plus the shared ones.
  // A scope's own list is excluded — its items are already shown in full below,
  // so a row pointing at the same thing would just be a second door.
  const listRows: ShoppingList[] = [
    ...allLists.filter((list) => list.id !== personalListId),
    ...sharedLists.filter((list) => !listIdsInScopes.has(list.id)),
  ];

  const groupNameFor = (list: ShoppingList) =>
    list.groupId ? (groups.find((group) => group.id === list.groupId)?.name ?? 'Csoport') : null;

  const [creatingList, setCreatingList] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);
  const [unsharingList, setUnsharingList] = useState<ShoppingList | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [enteringCode, setEnteringCode] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState<Group | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isPersonalScope = selected.key === PERSONAL_SCOPE;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: keyboardInset }]}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <Stack.Screen
        options={{
          title: 'PickIt',
          headerLeft: () => <HamburgerButton />,
          headerRight: () => (
            <View style={styles.headerActions}>
              {/* Signed-in only. For a guest this button led straight to a
                  dialog saying an account is needed — the same thing the notice
                  above the list now says, so it was a second door to one room.
                  Signed in it stays: the home screen's own shopping list has no
                  detail screen of its own, so this is the only way to share it. */}
              {user ? (
                <HeaderActionButton
                  label="Megosztás"
                  onPress={() => {
                    // Already shared: the button opens the group it belongs to,
                    // which is where the members and the rest of its lists are.
                    if (!isPersonalScope && selected.groupId) {
                      openGroup(selected.groupId);
                      return;
                    }
                    requestShare({
                      listId: selected.listId,
                      ensureListId: selected.ensureListId,
                      asMain: true,
                      what: 'a bevásárlólistád',
                    });
                  }}
                />
              ) : (
                // Registration by default: someone still using the app as a
                // guest usually has no account yet. Whichever is not offered
                // here stays reachable from the menu, from Beállítások, and from
                // a link at the bottom of each of the two screens.
                <HeaderActionButton
                  label={hadAccountHere ? 'Belépés' : 'Regisztráció'}
                  onPress={() => router.push(guestRoute)}
                />
              )}
            </View>
          ),
        }}
      />

      {/* Invisible until there is more than one shopping list to be looking at. */}
      <ScopeSelector scopes={scopes} selectedKey={selected.key} onSelect={select} />

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Gone the moment the list has anything on it. The tips are for the
            blank screen, and a blank screen stops existing after one item. */}
        {sections.length === 0 ? <HomeTips showInviteTip={groups.length === 0} /> : null}

        {/* Only once there is a list worth losing. An empty one needs none of
            this — the tips are showing instead, and they cover the same ground
            without standing between anyone and their shopping list. */}
        {!user && sections.length > 0 ? (
          <GuestListNotices
            hadAccountHere={hadAccountHere}
            onPress={() => router.push(guestRoute)}
          />
        ) : null}

        {user ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderInline}>Csoportjaim</Text>
              <Pressable onPress={() => setCreatingGroup(true)} hitSlop={8}>
                <Text style={styles.sectionAction}>+ Új csoport</Text>
              </Pressable>
            </View>
            {groups.length === 0 ? (
              <Text style={styles.sectionEmptyText}>
                Még nem osztottál meg semmit. A fenti Megosztás gombbal a bevásárlólistádat
                oszthatod meg, egy-egy listát pedig a saját képernyőjén.
              </Text>
            ) : (
              groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  isOwner={group.ownerId === user?.uid}
                  onPress={() => router.push(`/group/${group.id}`)}
                  onRenameRequest={() => setRenamingGroup(group)}
                  onDeleteRequest={() => setDeletingGroup(group)}
                  onLeaveRequest={() => setLeavingGroup(group)}
                />
              ))
            )}
            <Pressable
              style={styles.joinRow}
              onPress={() => setEnteringCode(true)}
              disabled={!isConnected}
            >
              <Text style={[styles.joinLabel, !isConnected && styles.joinLabelDisabled]}>
                Csatlakozás egy csoporthoz
              </Text>
              {!isConnected ? (
                <Text style={styles.joinHint}>
                  Nincs internetkapcsolat — a csatlakozáshoz kapcsolat kell.
                </Text>
              ) : null}
            </Pressable>
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderInline}>Listáim</Text>
          <Pressable onPress={() => setCreatingList(true)} hitSlop={8}>
            <Text style={styles.sectionAction}>+ Új lista</Text>
          </Pressable>
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

        {/* Naming the list the items belong to matters once there is more than
            one: the input at the bottom writes into whichever is selected. With
            a single scope and nothing on it, the heading would sit over empty
            space and label nothing — so it waits until there is something to
            label, or until there is a choice to disambiguate. */}
        {sections.length > 0 || scopes.length > 1 ? (
          <SectionHeaderRow
            title={isPersonalScope ? 'Bevásárlólistám' : `${selected.label} — bevásárlólista`}
          />
        ) : null}

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
          listId={selected.listId}
          groupId={selected.groupId}
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

      <PromptDialog
        visible={enteringCode}
        title="Meghívó kód"
        placeholder="pl. AB2C3D4E"
        onCancel={() => setEnteringCode(false)}
        onConfirm={(code) => {
          setEnteringCode(false);
          router.push(`/join/${code.trim().toUpperCase()}`);
        }}
      />

      <PromptDialog
        visible={creatingList}
        title="Új lista neve"
        placeholder="pl. Heti bevásárlás"
        onCancel={() => setCreatingList(false)}
        onConfirm={async (name) => {
          await createList(name);
          setCreatingList(false);
        }}
      />

      <PromptDialog
        visible={creatingGroup}
        title="Új csoport neve"
        placeholder="pl. Család"
        onCancel={() => setCreatingGroup(false)}
        onConfirm={async (name) => {
          await createGroup(name);
          setCreatingGroup(false);
        }}
      />

      <PromptDialog
        visible={!!renamingList}
        title="Lista átnevezése"
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

      <PromptDialog
        visible={!!renamingGroup}
        title="Csoport átnevezése"
        initialValue={renamingGroup?.name ?? ''}
        onCancel={() => setRenamingGroup(null)}
        onConfirm={async (name) => {
          if (renamingGroup) await renameGroup(renamingGroup.id, name);
          setRenamingGroup(null);
        }}
      />

      {/* Leaving runs through a Cloud Function, so offline it cannot even be
          queued — the dialog says so instead of pretending to work. */}
      <ConfirmDialog
        visible={!!leavingGroup}
        title={isConnected ? 'Kilépés a csoportból' : 'Nincs internetkapcsolat'}
        message={
          isConnected
            ? `Biztosan kilépsz a(z) "${leavingGroup?.name}" csoportból? A csoport listái és tételei ezután nem lesznek elérhetők. Új meghívóval bármikor visszatérhetsz.`
            : 'A csoportból kilépni csak online lehet. Próbáld újra, ha van kapcsolatod.'
        }
        confirmLabel={isConnected ? 'Kilépés' : 'Értem'}
        hideCancel={!isConnected}
        destructive={isConnected}
        onCancel={() => setLeavingGroup(null)}
        onConfirm={() => {
          const group = leavingGroup;
          setLeavingGroup(null);
          if (!group || !isConnected) return;
          leaveGroup(group.id).catch((e: any) =>
            setActionError(e?.message ?? 'Nem sikerült kilépni a csoportból.')
          );
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

      <ConfirmDialog
        visible={!!deletingGroup}
        title="Csoport törlése"
        message={`Biztosan törlöd a(z) "${deletingGroup?.name}" csoportot? A saját listáid megmaradnak, csak újra privátak lesznek. A többi tag által megosztott listák viszont eltűnnek.`}
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeletingGroup(null)}
        onConfirm={() => {
          if (deletingGroup) deleteGroup(deletingGroup.id);
          setDeletingGroup(null);
        }}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  // parent (sectionHeaderRow) already provides the 20px inset — so the header
  // text lines up with the rows below instead of sitting further in.
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
  sectionEmptyText: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  joinRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  joinLabel: {
    color: '#4A90D9',
    fontSize: 15,
    fontWeight: '500',
  },
  joinLabelDisabled: {
    color: '#9AA5AE',
  },
  joinHint: {
    color: '#D9534F',
    fontSize: 12,
    marginTop: 4,
  },
});
