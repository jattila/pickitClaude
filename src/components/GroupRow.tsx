import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SwipeableActionRow } from './SwipeableActionRow';
import type { Group } from '../data/types';

interface GroupRowProps {
  group: Group;
  isOwner: boolean;
  onPress: () => void;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
}

export function GroupRow({ group, isOwner, onPress, onRenameRequest, onDeleteRequest }: GroupRowProps) {
  const row = (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  if (!isOwner) return row;

  return (
    <SwipeableActionRow
      actions={[
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]}
    >
      {row}
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
