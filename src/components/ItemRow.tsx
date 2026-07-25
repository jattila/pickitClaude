import { StyleSheet, Text, View } from 'react-native';
import { SwipeableActionRow } from './SwipeableActionRow';
import type { ShoppingItem } from '../data/types';

interface ItemRowProps {
  item: ShoppingItem;
  onCheck: () => void;
  onRequestRestore: () => void;
  onRenameRequest: () => void;
  onQuantityRequest: () => void;
  onDeleteRequest: () => void;
}

function formatCheckedAt(timestamp: number | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

export function ItemRow({
  item,
  onCheck,
  onRequestRestore,
  onRenameRequest,
  onQuantityRequest,
  onDeleteRequest,
}: ItemRowProps) {
  const actions = item.checked
    ? [
        { key: 'restore', icon: '↩️', label: 'Visszateszem', onPress: onRequestRestore },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ]
    : [
        { key: 'rename', icon: '✏️', label: 'Átnevezés', onPress: onRenameRequest },
        { key: 'quantity', icon: '🔢', label: 'Mennyiség', onPress: onQuantityRequest },
        { key: 'delete', icon: '🗑️', label: 'Törlés', onPress: onDeleteRequest, destructive: true },
      ];

  return (
    <SwipeableActionRow actions={actions} onPress={item.checked ? onRequestRestore : onCheck}>
      <View style={styles.row}>
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <View style={styles.textColumn}>
          <Text style={[styles.name, item.checked && styles.nameChecked]}>
            {item.name}
            {item.quantity ? <Text style={styles.quantity}> · {item.quantity}</Text> : null}
          </Text>
          {item.checked ? (
            <Text style={styles.checkedMeta}>
              {item.checkedByName ? `${item.checkedByName} · ` : ''}
              {formatCheckedAt(item.checkedAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </SwipeableActionRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#BBB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  textColumn: {
    flex: 1,
  },
  name: {
    fontSize: 16,
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  quantity: {
    color: '#888',
    fontSize: 14,
  },
  checkedMeta: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 2,
  },
});
