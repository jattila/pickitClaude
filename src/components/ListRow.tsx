import { StyleSheet, Text, View } from 'react-native';
import { SwipeableActionRow } from './SwipeableActionRow';
import type { ShoppingList } from '../data/types';

interface ListRowProps {
  list: ShoppingList;
  /**
   * The group's name when this list is shared, null when it is private. Shown
   * rather than implied: a shared list looks exactly like a private one, and
   * the difference decides whether anyone else sees what you write on it.
   */
  sharedWith?: string | null;
  onPress: () => void;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
  /** Offered only on shared lists — the way back out, without deleting anything. */
  onUnshareRequest?: () => void;
}

export function ListRow({
  list,
  sharedWith,
  onPress,
  onRenameRequest,
  onDeleteRequest,
  onUnshareRequest,
}: ListRowProps) {
  return (
    <SwipeableActionRow
      onPress={onPress}
      actions={[
        ...(sharedWith && onUnshareRequest
          ? [{ key: 'unshare', icon: '🔒', label: 'Nem osztom', onPress: onUnshareRequest }]
          : []),
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Text style={styles.name}>{list.name}</Text>
          {sharedWith ? (
            <Text style={styles.sharedWith} numberOfLines={1}>
              megosztva · {sharedWith}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
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
  textColumn: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  sharedWith: {
    fontSize: 12,
    color: '#4A90D9',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#BBB',
  },
});
