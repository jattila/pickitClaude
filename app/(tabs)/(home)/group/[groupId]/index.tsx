import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useKeyboardInset } from '../../../../../src/hooks/useKeyboardInset';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../../../src/utils/keyboardAvoiding';
import { useGroupLists } from '../../../../../src/hooks/useGroupLists';
import { useGroups } from '../../../../../src/hooks/useGroups';
import { useGroupDefaultList } from '../../../../../src/hooks/useGroupDefaultListId';
import { useItemsPanel } from '../../../../../src/hooks/useItemsPanel';
import { ListRow } from '../../../../../src/components/ListRow';
import { ItemRow } from '../../../../../src/components/ItemRow';
import { SectionHeaderRow } from '../../../../../src/components/SectionHeaderRow';
import { ItemNameInput } from '../../../../../src/components/ItemNameInput';
import { PromptDialog } from '../../../../../src/components/PromptDialog';
import { ConfirmDialog } from '../../../../../src/components/ConfirmDialog';
import { FirestoreListsRepository } from '../../../../../src/data/cloud/FirestoreListsRepository';
import { isGroupDefaultList } from '../../../../../src/services/groups';
import type { ShoppingList } from '../../../../../src/data/types';

export default function GroupListsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { ref: keyboardRef, inset: keyboardInset } = useKeyboardInset();
  const { lists: allLists, loading, createList } = useGroupLists(groupId);
  const { groups } = useGroups();
  const group = groups.find((g) => g.id === groupId);

  const { listId: defaultListId, ensureListId } = useGroupDefaultList(groupId, group?.mainListId ?? null);
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
  } = useItemsPanel(defaultListId, ensureListId);

  // The group's whole shopping list is hidden from the list section — its items
  // surface directly below instead. That is either the list someone shared into
  // the group, or (for groups predating sharing) the deterministic loose-items
  // list.
  const lists = allLists.filter(
    (l) => !isGroupDefaultList(groupId, l.id) && l.id !== group?.mainListId
  );

  const [creating, setCreating] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: keyboardInset }]}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <Stack.Screen
        options={{
          title: group?.name ?? 'Csoport',
          // No catalog link: the bottom tab and the hamburger both open this
          // group's catalog while you're inside it, so a third route would only
          // crowd the header.
          headerRight: () => (
            <Pressable
              style={styles.shareButton}
              onPress={() => router.push(`/group/${groupId}/members`)}
              hitSlop={8}
            >
              <Text style={styles.shareLabel}>Megosztás</Text>
            </Pressable>
          ),
        }}
      />

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderInline}>Listák és tételek</Text>
          <Pressable onPress={() => setCreating(true)} hitSlop={8}>
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
          listId={defaultListId}
          groupId={groupId}
          onSubmit={handleAdd}
          excludeIds={existingItemIds}
        />
      </View>

      {itemDialogs}

      <PromptDialog
        visible={creating}
        title="Új lista neve"
        placeholder="pl. Heti bevásárlás"
        onCancel={() => setCreating(false)}
        onConfirm={async (name) => {
          await createList(name);
          setCreating(false);
        }}
      />

      <PromptDialog
        visible={!!renamingList}
        title="Lista átnevezése"
        initialValue={renamingList?.name ?? ''}
        onCancel={() => setRenamingList(null)}
        onConfirm={async (name) => {
          if (renamingList) await FirestoreListsRepository.renameList(renamingList.id, name);
          setRenamingList(null);
        }}
      />

      <ConfirmDialog
        visible={!!deletingList}
        title="Lista törlése"
        message={`Biztosan törlöd: "${deletingList?.name}"? Ez az összes tételt is törli, minden tagnál.`}
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeletingList(null)}
        onConfirm={() => {
          if (deletingList) FirestoreListsRepository.deleteList(deletingList.id);
          setDeletingList(null);
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
  // Matches the "Belépés" header button on the overview screen, so the two
  // header actions in the app read as the same kind of control.
  shareButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  shareLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  sectionHeaderInline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
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
});
