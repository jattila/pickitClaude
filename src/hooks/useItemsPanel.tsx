import { useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { ScrollView } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useRepository } from '../data/useRepository';
import { useListItems } from './useListItems';
import { useListMeta } from './useListMeta';
import { useUserSettings } from './useUserSettings';
import { useAuthStore } from '../store/authStore';
import { toItemId } from '../services/normalize';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PromptDialog } from '../components/PromptDialog';
import { RecentPurchaseBanner } from '../components/RecentPurchaseBanner';
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
  const {
    activeItems,
    checkedItems,
    renameItem,
    setItemQuantity,
    setItemFavorite,
    checkItem,
    restoreItem,
    deleteItem,
  } = useListItems(listId);
  const list = useListMeta(listId);
  const settings = useUserSettings();
  const myUid = useAuthStore((state) => state.user?.uid);

  const [pendingRestoreConfirm, setPendingRestoreConfirm] = useState<ShoppingItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<ShoppingItem | null>(null);
  const [quantityItem, setQuantityItem] = useState<ShoppingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ShoppingItem | null>(null);
  const [restoreRequest, setRestoreRequest] = useState<ShoppingItem | null>(null);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [dismissedRecentIds, setDismissedRecentIds] = useState<Set<string>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);

  const handleAdd = async (name: string, quantity: string | null = null) => {
    const newId = toItemId(name).id;
    setScrollTargetId(newId);
    try {
      // Screen against the items already on screen before writing. This is the
      // real "don't re-add / don't silently un-check" guard: it comes from the
      // live listener, which is cache-backed and so still correct offline,
      // unlike a fresh getDoc() for a document the client has never fetched.
      const alreadyOnList = [...activeItems, ...checkedItems].find((item) => item.id === newId);
      if (alreadyOnList) {
        setScrollTargetId(alreadyOnList.checked ? null : newId);
        if (alreadyOnList.checked) setPendingRestoreConfirm(alreadyOnList);
        // Re-adding an item already on the list is how you'd naturally correct
        // its amount, so honour a quantity typed alongside it.
        else if (quantity) await setItemQuantity(alreadyOnList.id, quantity);
        return;
      }

      const targetId = listId ?? (ensureListId ? await ensureListId() : null);
      if (!targetId) {
        setScrollTargetId(null);
        return;
      }
      const { wasAlreadyChecked, item } = await repo.addItem(targetId, name, quantity);
      if (wasAlreadyChecked) {
        setScrollTargetId(null);
        setPendingRestoreConfirm(item);
      }
    } catch (e: any) {
      // Fires from a Pressable's onPress, so an uncaught rejection here would
      // otherwise surface as an unhandled-promise-rejection redbox instead of
      // a normal, recoverable error.
      setScrollTargetId(null);
      Alert.alert('Nem sikerült hozzáadni', e?.message ?? 'Ismeretlen hiba történt.');
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

  const toggleFavorite = (item: ShoppingItem) => {
    setItemFavorite(item.id, !item.favorite).catch(() => undefined);
  };

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

      <PromptDialog
        visible={!!quantityItem}
        title="Mennyiség"
        placeholder="pl. 2 kg, 1 doboz"
        initialValue={quantityItem?.quantity ?? ''}
        // allowEmpty: submitting nothing is how you clear a quantity you no
        // longer want, which the dialog otherwise treats as "nothing to do".
        allowEmpty
        onCancel={() => setQuantityItem(null)}
        onConfirm={async (value) => {
          if (quantityItem) await setItemQuantity(quantityItem.id, value.trim() || null);
          setQuantityItem(null);
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

  // "Someone else already bought this recently" only makes sense on a shared
  // (group) list — personal/guest lists have no one else who could have.
  const recentPurchases = useMemo(() => {
    if (!list?.groupId || !settings.recentPurchaseWarningEnabled) return [];
    const windowMs = settings.recentPurchaseWindowMinutes * 60_000;
    const now = Date.now();
    return checkedItems.filter(
      (item) =>
        item.checkedBy &&
        item.checkedBy !== myUid &&
        item.checkedAt &&
        now - item.checkedAt <= windowMs &&
        !dismissedRecentIds.has(item.id)
    );
  }, [list?.groupId, settings, checkedItems, myUid, dismissedRecentIds]);

  const recentPurchaseBanners = (
    <>
      {recentPurchases.map((item) => (
        <RecentPurchaseBanner
          key={item.id}
          item={item}
          onDismiss={() => setDismissedRecentIds((prev) => new Set(prev).add(item.id))}
        />
      ))}
    </>
  );

  return {
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
    dialogs,
  };
}
