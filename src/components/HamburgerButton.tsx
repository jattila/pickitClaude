import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUiStore } from '../store/uiStore';

/** Opens the global hamburger menu (see `HamburgerMenu`). Used as a header-left button. */
export function HamburgerButton() {
  const openMenu = useUiStore((state) => state.openMenu);

  return (
    <Pressable onPress={openMenu} hitSlop={12} style={styles.button}>
      <Ionicons name="menu" size={24} color="#333" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
  },
});
