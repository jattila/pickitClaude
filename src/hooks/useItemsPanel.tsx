import { useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useRepository } from '../data/useRepository';
import { useListItems } from './useListItems';
import { toItemId } from '../services/normalize';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PromptDialog } from '../components/PromptDialog';
import type { ShoppingItem } from '../data/types';

/**
 * Shared logic behind an items list + quick-add input: sections, the
 * scroll-to-newly-added-item behavior, and the rename/delete/restore dialogs.
 * Used by both the list detail screen and the overview screen's quick-add panel.
 *
 * `ensureListId` (optional) lets a screen defer creating its hidden default list
 * until the first item is actually added — when `listId` is null and the user
 * adds, we resolve/create the target list on demand.
 */
export function useItemsPanel(listId: string | null, ensureListId?: () => Promise<string>) {
  const repo = useRepository();
  const { activeItems, checkedItems, renameItem, checkItem, restoreItem, deleteItem } =
    useListItems(listId);

  const [pendingRestoreConfirm, setPendingRestoreConfirm] = useState<ShoppingItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<ShoppingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ShoppingItem | null>(null);
  const [restoreRequest, setRestoreRequest] = useState<ShoppingItem | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleAdd = async (name: string) => {
    setScrollTargetId(toItemId(name).id);
    const targetId = listId ?? (ensureListId ? await ensureListId() : null);
    if (!targetId) {
      setScrollTargetId(null);
      return;
    }
    const { wasAlreadyChecked, item } = await repo.addItem(targetId, name);
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

  // No header for the active items — only the "Megvéve" (bought) section gets one.
  const sections: { title: string | null; data: ShoppingItem[] }[] = [
    { title: null, data: activeItems },
    { title: 'Megvéve', data: checkedItems },
  ].filter((section) => section.data.length > 0);

  const dialogs = (
    <>
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
        onConfirm={async (name) => {
          if (renamingItem) await renameItem(renamingItem.id, name);
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
    </>
  );

  // Ids already on the list (active or bought) — used to keep the autocomplete
  // from suggesting products that are already here.
  const existingItemIds = [...activeItems, ...checkedItems].map((item) => item.id);

  return {
    scrollViewRef,
    sections,
    scrollTargetId,
    handleTargetLayout,
    handleAdd,
    existingItemIds,
    setRestoreRequest,
    setRenamingItem,
    setDeletingItem,
    checkItem,
    dialogs,
  };
}
