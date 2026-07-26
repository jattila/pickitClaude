import { Fragment } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../../src/utils/keyboardAvoiding';
import { useListMeta } from '../../../../src/hooks/useListMeta';
import { useItemsPanel } from '../../../../src/hooks/useItemsPanel';
import { ItemRow } from '../../../../src/components/ItemRow';
import { ItemNameInput } from '../../../../src/components/ItemNameInput';

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const list = useListMeta(listId);
  const headerHeight = useHeaderHeight();

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
    dialogs,
  } = useItemsPanel(listId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <Stack.Screen options={{ title: list?.name ?? 'Lista' }} />

      {recentPurchaseBanners}

      <ScrollView ref={scrollViewRef} style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Még nincs tétel ezen a listán.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <Fragment key={section.title ?? 'active'}>
              {section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null}
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

      <View>
        <ItemNameInput listId={listId} onSubmit={handleAdd} excludeIds={existingItemIds} />
      </View>

      {dialogs}
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
