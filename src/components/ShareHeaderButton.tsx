import { Pressable, StyleSheet, Text } from 'react-native';

interface ShareHeaderButtonProps {
  onPress: () => void;
  /** "Megosztás" to start one, "Tagok" once there is a group to manage. */
  label?: string;
}

/**
 * The blue pill in the navigation header. Deliberately identical to "Belépés"
 * and to the group screen's own button: these are the app's three header
 * actions, and they should read as the same kind of control.
 */
export function ShareHeaderButton({ onPress, label = 'Megosztás' }: ShareHeaderButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress} hitSlop={8}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
