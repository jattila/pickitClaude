import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SectionList, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLists } from '../../../src/hooks/useLists';
import { useListItems } from '../../../src/hooks/useListItems';
import { ItemRow } from '../../../src/components/ItemRow';
import { ItemNameInput } from '../../../src/components/ItemNameInput';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { PromptDialog } from '../../../src/components/PromptDialog';
import type { ShoppingItem } from '../../../src/data/types';

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { lists } = useLists();
  const list = lists.find((l) => l.id === listId);
  const headerHeight = useHeaderHeight();

  const { activeItems, checkedItems, addItem, renameItem, checkItem, restoreItem, deleteItem } =
    useListItems(listId);

  const [pendingRestoreConfirm, setPendingRestoreConfirm] = useState<ShoppingItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<ShoppingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ShoppingItem | null>(null);
  const [restoreRequest, setRestoreRequest] = useState<ShoppingItem | null>(null);

  const sectionListRef = useRef<SectionList<ShoppingItem>>(null);
  const previousActiveCountRef = useRef(activeItems.length);
  const pendingScrollRef = useRef(false);

  useEffect(() => {
    // New active items are appended to the end of the "Teendő" section (sorted
    // by createdAt asc) — once the freshly-added item actually shows up in
    // activeItems, scroll to it so the user sees what they just added.
    if (pendingScrollRef.current && activeItems.length > previousActiveCountRef.current) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: activeItems.length - 1,
        viewPosition: 1,
        animated: true,
      });
      pendingScrollRef.current = false;
    }
    previousActiveCountRef.current = activeItems.length;
  }, [activeItems.length]);

  const handleAdd = async (name: string) => {
    const { wasAlreadyChecked, item } = await addItem(name);
    if (wasAlreadyChecked) {
      setPendingRestoreConfirm(item);
      return;
    }
    pendingScrollRef.current = true;
  };

  const sections = [
    { title: 'Teendő', data: activeItems },
    { title: 'Megvéve', data: checkedItems },
  ].filter((section) => section.data.length > 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen options={{ title: list?.name ?? 'Lista' }} />

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onCheck={() => checkItem(item.id)}
            onRequestRestore={() => setRestoreRequest(item)}
            onRenameRequest={() => setRenamingItem(item)}
            onDeleteRequest={() => setDeletingItem(item)}
          />
        )}
        onScrollToIndexFailed={() => {}}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Még nincs tétel ezen a listán.</Text>
          </View>
        }
      />

      <ItemNameInput listId={listId} onSubmit={handleAdd} />

      <ConfirmDialog
        visible={!!pendingRestoreConfirm}
        title="Ezt már megvették"
        message={`"${pendingRestoreConfirm?.name}" már be van jelölve mint megvéve${
          pendingRestoreConfirm?.checkedByName ? ` (${pendingRestoreConfirm.checkedByName})` : ''
        }. Visszateszed a listára?`}
        confirmLabel="Visszateszem"
        onCancel={() => setPendingRestoreConfirm(null)}
        onConfirm={() => {
          if (pendingRestoreConfirm) restoreItem(pendingRestoreConfirm.id);
          setPendingRestoreConfirm(null);
        }}
      />

      <ConfirmDialog
        visible={!!restoreRequest}
        title="Visszateszed a listára?"
        message={`"${restoreRequest?.name}" jelenleg megvéve${
          restoreRequest?.checkedByName ? ` (${restoreRequest.checkedByName})` : ''
        }.`}
        confirmLabel="Visszateszem"
        onCancel={() => setRestoreRequest(null)}
        onConfirm={() => {
          if (restoreRequest) restoreItem(restoreRequest.id);
          setRestoreRequest(null);
        }}
      />

      <PromptDialog
        visible={!!renamingItem}
        title="Tétel átnevezése"
        initialValue={renamingItem?.name ?? ''}
        onCancel={() => setRenamingItem(null)}
        onConfirm={(name) => {
          if (renamingItem) renameItem(renamingItem.id, name);
          setRenamingItem(null);
        }}
      />

      <ConfirmDialog
        visible={!!deletingItem}
        title="Tétel törlése"
        message={`Biztosan törlöd: "${deletingItem?.name}"?`}
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => {
          if (deletingItem) deleteItem(deletingItem.id);
          setDeletingItem(null);
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
  },
});
