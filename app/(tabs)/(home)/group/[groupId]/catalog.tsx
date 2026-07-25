import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCatalogEntries } from '../../../../../src/hooks/useCatalogEntries';
import { useGroups } from '../../../../../src/hooks/useGroups';
import { CatalogRow } from '../../../../../src/components/CatalogRow';
import { PromptDialog } from '../../../../../src/components/PromptDialog';
import { ConfirmDialog } from '../../../../../src/components/ConfirmDialog';
import type { CatalogEntry } from '../../../../../src/data/types';

export default function GroupCatalogScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groups } = useGroups();
  const group = groups.find((g) => g.id === groupId);
  const { entries, loading, renameEntry, deleteEntry } = useCatalogEntries(groupId);
  const [renamingEntry, setRenamingEntry] = useState<CatalogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CatalogEntry | null>(null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: group ? `${group.name} katalógusa` : 'Katalógus' }} />

      {!loading && entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Még nincs egyetlen termék sem a katalógusban.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {entries.map((entry) => (
            <CatalogRow
              key={entry.id}
              entry={entry}
              onRenameRequest={() => setRenamingEntry(entry)}
              onDeleteRequest={() => setDeletingEntry(entry)}
            />
          ))}
        </ScrollView>
      )}

      <PromptDialog
        visible={!!renamingEntry}
        title="Termék átnevezése"
        initialValue={renamingEntry?.name ?? ''}
        onConfirm={async (name) => {
          if (renamingEntry) await renameEntry(renamingEntry.id, name);
          setRenamingEntry(null);
        }}
        onCancel={() => setRenamingEntry(null)}
      />

      <ConfirmDialog
        visible={!!deletingEntry}
        title="Termék törlése a katalógusból"
        message={`Biztosan törlöd: "${deletingEntry?.name}"? Ez csak az ajánlásokból veszi ki — a listákon már szereplő tételeket nem érinti.`}
        confirmLabel="Törlés"
        destructive
        onCancel={() => setDeletingEntry(null)}
        onConfirm={() => {
          if (deletingEntry) deleteEntry(deletingEntry.id);
          setDeletingEntry(null);
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
    paddingBottom: 16,
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
