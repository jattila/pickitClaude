import { Fragment, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useGroupLists } from '../../../../../src/hooks/useGroupLists';
import { useGroups } from '../../../../../src/hooks/useGroups';
import { useGroupDefaultList } from '../../../../../src/hooks/useGroupDefaultListId';
import { useItemsPanel } from '../../../../../src/hooks/useItemsPanel';
import { ListRow } from '../../../../../src/components/ListRow';
import { ItemRow } from '../../../../../src/components/ItemRow';
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
  const { lists: allLists, loading, createList } = useGroupLists(groupId);
  const { groups } = useGroups();
  const group = groups.find((g) => g.id === groupId);

  const { listId: defaultListId, ensureListId } = useGroupDefaultList(groupId);
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

  // The shared quick-add list is hidden from the group's list section — its
  // items surface directly below instead.
  const lists = allLists.filter((l) => !isGroupDefaultList(groupId, l.id));

  const [creating, setCreating] = useState(false);
  const [renamingList, setRenamingList] = useState<ShoppingList | null>(null);
  const [deletingList, setDeletingList] = useState<ShoppingList | null>(null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{
          title: group?.name ?? 'Csoport',
          headerRight: () => (
            <View style={styles.headerLinks}>
              <Pressable onPress={() => router.push(`/group/${groupId}/catalog`)} hitSlop={8}>
                <Text style={styles.membersLink}>Katalógus</Text>
              </Pressable>
              <Pressable onPress={() => router.push(`/group/${groupId}/members`)} hitSlop={8}>
                <Text style={styles.membersLink}>Tagok</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
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
  headerLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  membersLink: {
    color: '#4A90D9',
    fontSize: 15,
    paddingHorizontal: 4,
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
