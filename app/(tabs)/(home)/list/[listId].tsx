import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { useKeyboardInset } from '../../../../src/hooks/useKeyboardInset';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../../src/utils/keyboardAvoiding';
import { useListMeta } from '../../../../src/hooks/useListMeta';
import { useItemsPanel } from '../../../../src/hooks/useItemsPanel';
import { useGroups } from '../../../../src/hooks/useGroups';
import { useShareFlow } from '../../../../src/hooks/useShareFlow';
import { ItemRow } from '../../../../src/components/ItemRow';
import { SectionHeaderRow } from '../../../../src/components/SectionHeaderRow';
import { ItemNameInput } from '../../../../src/components/ItemNameInput';
import { ShareHeaderButton } from '../../../../src/components/ShareHeaderButton';

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const list = useListMeta(listId);
  const headerHeight = useHeaderHeight();
  const { ref: keyboardRef, inset: keyboardInset } = useKeyboardInset();
  const { groups } = useGroups();
  const { requestShare, openGroup, dialogs: shareDialogs } = useShareFlow();

  // This is the entry point for the party case: make a list, then decide who it
  // is for. Once shared, the same button turns into the way to reach the people
  // it is shared with — the button's job is "who can see this", either way.
  const sharedGroup = list?.groupId ? groups.find((group) => group.id === list.groupId) : null;

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
    dialogs,
  } = useItemsPanel(listId);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: keyboardInset }]}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <Stack.Screen
        options={{
          title: list?.name ?? 'Lista',
          headerRight: () => (
            <ShareHeaderButton
              label="Megosztás"
              onPress={() => {
                if (list?.groupId) openGroup(list.groupId);
                else
                  requestShare({
                    listId,
                    asMain: false,
                    what: `"${list?.name ?? 'ez a lista'}"`,
                  });
              }}
            />
          ),
        }}
      />

      {sharedGroup ? (
        <Text style={styles.sharedBanner}>Megosztva · {sharedGroup.name}</Text>
      ) : null}

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Még nincs tétel ezen a listán.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <Fragment key={section.title ?? 'active'}>
              {section.title ? (
              <SectionHeaderRow
                title={section.title}
                actionLabel={checkedCount > 0 ? 'Mind törlése' : undefined}
                onAction={clearCheckedRequest}
              />
            ) : null}
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
                    onQuantityRequest={() => setQuantityItem(item)}
                    onToggleFavorite={() => toggleFavorite(item)}
                    onDeleteRequest={() => setDeletingItem(item)}
                  />
                </View>
              ))}
            </Fragment>
          ))
        )}
      </ScrollView>

      <View ref={keyboardRef} collapsable={false}>
        <ItemNameInput
          listId={listId}
          groupId={list?.groupId}
          onSubmit={handleAdd}
          excludeIds={existingItemIds}
        />
      </View>

      {dialogs}
      {shareDialogs}
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
  // A quiet strip rather than a badge in the title: on a shared list every tick
  // and every added item is visible to other people, and that is worth stating
  // plainly on the screen where the typing happens.
  sharedBanner: {
    fontSize: 12,
    color: '#4A90D9',
    backgroundColor: '#EAF2FB',
    paddingHorizontal: 20,
    paddingVertical: 8,
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
