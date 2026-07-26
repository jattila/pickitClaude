import { StyleSheet, Text, View } from 'react-native';
import { SwipeableActionRow } from './SwipeableActionRow';
import type { Group } from '../data/types';

interface GroupRowProps {
  group: Group;
  isOwner: boolean;
  onPress: () => void;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
  onLeaveRequest: () => void;
}

export function GroupRow({
  group,
  isOwner,
  onPress,
  onRenameRequest,
  onDeleteRequest,
  onLeaveRequest,
}: GroupRowProps) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.name}>{group.name}</Text>
      <Text style={styles.chevron}>›</Text>
    </View>
  );

  // The owner manages the group; everyone else can only walk away from it.
  // Owners have no "leave" — it would strand the group with nobody able to
  // manage or delete it; deleting is their equivalent.
  const actions = isOwner
    ? [
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]
    : [{ key: 'leave', icon: '🚪', label: 'Kilépés', onPress: onLeaveRequest, destructive: true }];

  return (
    <SwipeableActionRow onPress={onPress} actions={actions}>
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
