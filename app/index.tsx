import { Fragment, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLists } from '../src/hooks/useLists';
import { useGroups } from '../src/hooks/useGroups';
import { useDefaultListId } from '../src/hooks/useQuickAdd';
import { useItemsPanel } from '../src/hooks/useItemsPanel';
import { useAuthStore } from '../src/store/authStore';
import { ListRow } from '../src/components/ListRow';
import { GroupRow } from '../src/components/GroupRow';
import { ItemRow } from '../src/components/ItemRow';
import { ItemNameInput } from '../src/components/ItemNameInput';
import { PromptDialog } from '../src/components/PromptDialog';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import type { Group, ShoppingList } from '../src/data/types';

export default function ListsOverviewScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const defaultListId = useDefaultListId();
  const { lists: allLists, loading, createList, renameList, deleteList } = useLists();
  const { groups, createGroup, renameGroup, deleteGroup } = useGroups();

  const {
    scrollViewRef,
    sections,
    scrollTargetId,
    handleTargetLayout,
    handleAdd,
    setRestoreRequest,
    setRenamingItem,
    setDeletingItem,
    checkItem,
    dialogs: itemDialogs,
  } = useItemsPanel(defaultListId);

  // The quick-add list is a perfectly ordinary list under the hood, but it's
  // never shown in "Saját listáim" — its items surface directly up here instead.
  const lists = allLists.filter((l) => l.id !== defaultListId);

  const [creatingList, setCreatingList] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen
        options={{
          title: 'PickIt',
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
              <Text style={styles.settingsLink}>Beállítások</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <Fragment key={section.title}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.data.map((item) => (
              <View key={item.id} onLayout={item.id === scrollTargetId ? handleTargetLayout : undefined}>
                <ItemRow
                  item={item}
                  onCheck={() => checkItem(item.id)}
                  onRequestRestore={() => setRestoreRequest(item)}
                  onRenameRequest={() => setRenamingItem(item)}
                  onDeleteRequest={() => setDeletingItem(item)}
                />
              </View>
            ))}
          </Fragment>
        ))}

        {user ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Csoportjaim</Text>
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
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Saját listáim</Text>
          <Pressable onPress={() => setCreatingList(true)} hitSlop={8}>
            <Text style={styles.sectionAction}>+ Új lista</Text>
          </Pressable>
        </View>
        {!loading && lists.length === 0 ? (
          <Text style={styles.sectionEmptyText}>Még nincs külön listád.</Text>
        ) : (
          lists.map((item) => (
            <ListRow
              key={item.id}
              list={item}
              onPress={() => router.push(`/list/${item.id}`)}
              onRenameRequest={() => setRenamingList(item)}
              onDeleteRequest={() => setDeletingList(item)}
            />
          ))
        )}
      </ScrollView>

      {defaultListId ? <ItemNameInput listId={defaultListId} onSubmit={handleAdd} /> : null}

      {itemDialogs}

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
  settingsLink: {
    color: '#4A90D9',
    fontSize: 15,
    paddingHorizontal: 4,
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
});
