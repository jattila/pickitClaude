import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLists } from '../src/hooks/useLists';
import { useGroups } from '../src/hooks/useGroups';
import { useAuthStore } from '../src/store/authStore';
import { ListRow } from '../src/components/ListRow';
import { PromptDialog } from '../src/components/PromptDialog';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import type { ShoppingList } from '../src/data/types';

export default function ListsOverviewScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { lists, loading, createList, renameList, deleteList } = useLists();
  const { groups, createGroup } = useGroups();

  const [creatingList, setCreatingList] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);

  const nothingToShow = !loading && lists.length === 0 && groups.length === 0;

  return (
    <View style={styles.container}>
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

      {nothingToShow ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nincs még listád</Text>
          <Text style={styles.emptyText}>Hozz létre egy bevásárlólistát az alábbi gombbal.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
                  <Pressable
                    key={group.id}
                    style={styles.groupRow}
                    onPress={() => router.push(`/group/${group.id}`)}
                  >
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))
              )}
            </>
          ) : null}

          <Text style={styles.sectionHeader}>Saját listáim</Text>
          {lists.length === 0 ? (
            <Text style={styles.sectionEmptyText}>Még nincs személyes listád.</Text>
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
      )}

      <Pressable style={styles.fab} onPress={() => setCreatingList(true)}>
        <Text style={styles.fabLabel}>+ Új lista</Text>
      </Pressable>

      <PromptDialog
        visible={creatingList}
        title="Új lista neve"
        placeholder="pl. Heti bevásárlás"
        onCancel={() => setCreatingList(false)}
        onConfirm={(name) => {
          setCreatingList(false);
          createList(name);
        }}
      />

      <PromptDialog
        visible={creatingGroup}
        title="Új csoport neve"
        placeholder="pl. Család"
        onCancel={() => setCreatingGroup(false)}
        onConfirm={(name) => {
          setCreatingGroup(false);
          createGroup(name);
        }}
      />

      <PromptDialog
        visible={!!renamingList}
        title="Lista átnevezése"
        initialValue={renamingList?.name ?? ''}
        onCancel={() => setRenamingList(null)}
        onConfirm={(name) => {
          if (renamingList) renameList(renamingList.id, name);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 96,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
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
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#BBB',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: '#4A90D9',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabLabel: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
