import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SwipeableActionRow } from './SwipeableActionRow';
import type { ShoppingList } from '../data/types';

interface ListRowProps {
  list: ShoppingList;
  onPress: () => void;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
}

export function ListRow({ list, onPress, onRenameRequest, onDeleteRequest }: ListRowProps) {
  return (
    <SwipeableActionRow
      actions={[
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]}
    >
      <Pressable onPress={onPress} style={styles.row}>
        <Text style={styles.name}>{list.name}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </SwipeableActionRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#BBB',
  },
});
