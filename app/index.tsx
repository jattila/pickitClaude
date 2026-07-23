import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLists } from '../src/hooks/useLists';
import { ListRow } from '../src/components/ListRow';
import { PromptDialog } from '../src/components/PromptDialog';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import type { ShoppingList } from '../src/data/types';

export default function ListsOverviewScreen() {
  const router = useRouter();
  const { lists, loading, createList, renameList, deleteList } = useLists();

  const [creating, setCreating] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);

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
      {!loading && lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nincs még listád</Text>
          <Text style={styles.emptyText}>Hozz létre egy bevásárlólistát az alábbi gombbal.</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListRow
              list={item}
              onPress={() => router.push(`/list/${item.id}`)}
              onRenameRequest={() => setRenamingList(item)}
              onDeleteRequest={() => setDeletingList(item)}
            />
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabLabel}>+ Új lista</Text>
      </Pressable>

      <PromptDialog
        visible={creating}
        title="Új lista neve"
        placeholder="pl. Heti bevásárlás"
        onCancel={() => setCreating(false)}
        onConfirm={(name) => {
          setCreating(false);
          createList(name);
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
