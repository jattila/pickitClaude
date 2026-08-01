import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SectionHeaderRowProps {
  title: string;
  /** Shown on the right; omitted entirely when there is nothing to act on. */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * A section title with an optional action on the right — used by the "Megvéve"
 * section to clear what's been bought.
 *
 * Its own component because all three list screens render the same sections,
 * and the alternative was the same header markup copied three times.
 */
export function SectionHeaderRow({ title, actionLabel, onAction }: SectionHeaderRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
  },
  action: {
    fontSize: 14,
    color: '#D9534F',
  },
});
