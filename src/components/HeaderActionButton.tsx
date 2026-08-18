import { Pressable, StyleSheet, Text } from 'react-native';

interface HeaderActionButtonProps {
  onPress: () => void;
  label: string;
}

/**
 * The app's navigation-header action, in all four places it appears.
 *
 * Text on its own, with no background of its own. It used to be a filled blue
 * pill, which iOS 26 then drew its own rounded button background behind — two
 * frames nested inside each other, neither of them intentional. Leaving the
 * chrome to the system means the button looks native on whatever it is running
 * on, and the app has one less thing to keep in step with the OS.
 *
 * The generous hitSlop is doing real work: without the pill's padding the text
 * alone is a small target in a thin bar.
 */
export function HeaderActionButton({ onPress, label }: HeaderActionButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress} hitSlop={12}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  label: {
    color: '#4A90D9',
    fontSize: 16,
    fontWeight: '500',
  },
});
