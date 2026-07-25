import { StyleSheet, Text, View } from 'react-native';
import { SwipeableActionRow } from './SwipeableActionRow';
import type { CatalogEntry } from '../data/types';

interface CatalogRowProps {
  entry: CatalogEntry;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
}

export function CatalogRow({ entry, onRenameRequest, onDeleteRequest }: CatalogRowProps) {
  return (
    <SwipeableActionRow
      actions={[
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.name}>{entry.name}</Text>
        {entry.usageCount > 1 ? <Text style={styles.usage}>{entry.usageCount}×</Text> : null}
      </View>
    </SwipeableActionRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  name: {
    fontSize: 16,
  },
  usage: {
    fontSize: 13,
    color: '#AAA',
  },
});
