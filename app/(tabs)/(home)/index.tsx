import { Fragment, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../src/utils/keyboardAvoiding';
import { useLists } from '../../../src/hooks/useLists';
import { useGroups } from '../../../src/hooks/useGroups';
import { useDefaultList } from '../../../src/hooks/useQuickAdd';
import { useItemsPanel } from '../../../src/hooks/useItemsPanel';
import { useAuthStore } from '../../../src/store/authStore';
import { ListRow } from '../../../src/components/ListRow';
import { GroupRow } from '../../../src/components/GroupRow';
import { ItemRow } from '../../../src/components/ItemRow';
import { ItemNameInput } from '../../../src/components/ItemNameInput';
import { PromptDialog } from '../../../src/components/PromptDialog';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { HamburgerButton } from '../../../src/components/HamburgerButton';
import type { Group, ShoppingList } from '../../../src/data/types';

export default function ListsOverviewScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const user = useAuthStore((state) => state.user);
  const { listId: defaultListId, ensureListId } = useDefaultList();
  const { lists: allLists, loading, createList, renameList, deleteList } = useLists();
  const { groups, createGroup, renameGroup, deleteGroup } = useGroups();

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
    checkItem,
    dialogs: itemDialogs,
  } = useItemsPanel(defaultListId, ensureListId);

  // The hidden quick-add list (once it exists) is never shown in "Saját listáim" —
  // its items surface directly up here instead.
  const lists = allLists.filter((l) => l.id !== defaultListId);

  const [creatingList, setCreatingList] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [enteringCode, setEnteringCode] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <Stack.Screen
        options={{
          title: 'PickIt',
          headerLeft: () => <HamburgerButton />,
          // Guests get a way in from the main screen; signed-in users already
          // have their account under the hamburger and in Beállítások.
          headerRight: user
            ? undefined
            : () => (
                <Pressable style={styles.signInButton} onPress={() => router.push('/sign-in')} hitSlop={8}>
                  <Text style={styles.signInLabel}>Belépés</Text>
                </Pressable>
              ),
        }}
      />

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {user ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderInline}>Csoportjaim</Text>
              <Pressable onPress={() => setCreatingGroup(true)} hitSlop={8}>
                <Text style={styles.sectionAction}>+ Új csoport</Text>
              </Pressable>
            </View>
            {groups.length === 0 ? (
              <Text style={styles.sectionEmptyText}>Még nem vagy tagja egyetlen csoportnak sem.</Text>
            ) : (
              groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  isOwner={group.ownerId === user?.uid}
                  onPress={() => router.push(`/group/${group.id}`)}
                  onRenameRequest={() => setRenamingGroup(group)}
                  onDeleteRequest={() => setDeletingGroup(group)}
                />
              ))
            )}
            <Pressable style={styles.joinRow} onPress={() => setEnteringCode(true)}>
              <Text style={styles.joinLabel}>Csatlakozás egy csoporthoz</Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderInline}>Saját listáim és tételeim</Text>
          <Pressable onPress={() => setCreatingList(true)} hitSlop={8}>
            <Text style={styles.sectionAction}>+ Új lista</Text>
          </Pressable>
        </View>
        {!loading &&
          lists.map((item) => (
            <ListRow
              key={item.id}
              list={item}
              onPress={() => router.push(`/list/${item.id}`)}
              onRenameRequest={() => setRenamingList(item)}
              onDeleteRequest={() => setDeletingList(item)}
            />
          ))}

        {sections.map((section) => (
          <Fragment key={section.title ?? 'active'}>
            {section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null}
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

      <ItemNameInput listId={defaultListId} onSubmit={handleAdd} excludeIds={existingItemIds} />

      {itemDialogs}

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
        message={`Biztosan törlöd: "${deletingList?.name}"? Ez az összes tételt is törli.`}
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeletingList(null)}
        onConfirm={() => {
          if (deletingList) deleteList(deletingList.id);
          setDeletingList(null);
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

      <ConfirmDialog
        visible={!!deletingGroup}
        title="Csoport törlése"
        message={`Biztosan törlöd a(z) "${deletingGroup?.name}" csoportot? Ez minden tagnál törli a csoport összes listáját és tételét.`}
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
  scrollContent: {
    paddingBottom: 16,
  },
  signInButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  signInLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  // Same look as sectionHeader but without horizontal padding, because its
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
});
