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
  const content = (
    <View style={styles.row}>
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
  );

  if (!isOwner) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return (
    <SwipeableActionRow
      onPress={onPress}
      actions={[
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]}
    >
      {content}
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
