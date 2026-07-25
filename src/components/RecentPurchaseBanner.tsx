import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShoppingItem } from '../data/types';

function formatElapsed(checkedAt: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - checkedAt) / 60_000));
  return minutes === 1 ? '1 perce' : `${minutes} perce`;
}

interface RecentPurchaseBannerProps {
  item: ShoppingItem;
  onDismiss: () => void;
}

/** Warns that someone else on this group list already checked off `item` recently — see useItemsPanel. */
export function RecentPurchaseBanner({ item, onDismiss }: RecentPurchaseBannerProps) {
  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle" size={18} color="#8A6D3B" />
      <Text style={styles.text}>
        <Text style={styles.bold}>{item.checkedByName ?? 'Valaki'}</Text> nemrég bejelölte: {item.name}
        {item.checkedAt ? ` (${formatElapsed(item.checkedAt)})` : ''}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color="#8A6D3B" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCF3CF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6D8A8',
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: '#6B5B2A',
  },
  bold: {
    fontWeight: '700',
  },
});
