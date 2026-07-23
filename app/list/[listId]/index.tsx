import { Fragment, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useLists } from '../../../src/hooks/useLists';
import { useListItems } from '../../../src/hooks/useListItems';
import { toItemId } from '../../../src/services/normalize';
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
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleAdd = async (name: string) => {
    // The item id is a deterministic slug of the name, so we know it before the
    // write even resolves — set it as the scroll target right away so the row's
    // very first onLayout (once it appears) triggers the scroll, instead of
    // racing the add's async round-trip and missing that first layout pass.
    setScrollTargetId(toItemId(name).id);
    const { wasAlreadyChecked, item } = await addItem(name);
    if (wasAlreadyChecked) {
      setScrollTargetId(null);
      setPendingRestoreConfirm(item);
    }
  };

  const handleTargetLayout = (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setScrollTargetId(null);
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

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Még nincs tétel ezen a listán.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <Fragment key={section.title}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {section.data.map((item) => (
                <View
                  key={item.id}
                  onLayout={item.id === scrollTargetId ? handleTargetLayout : undefined}
                >
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
          ))
        )}
      </ScrollView>

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
  scrollContent: {
    flexGrow: 1,
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
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
  },
});
