import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeaderBackButton, type HeaderBackButtonProps } from '@react-navigation/elements';
import { HamburgerButton } from './HamburgerButton';

/**
 * Header-left for non-root screens in the home stack: hamburger first, then
 * the native back arrow. Native Stack's `headerLeft` render props don't
 * include `onPress` (unlike the classic JS Stack) — it only supplies it when
 * *it* renders the default back button — so we wire `navigation.goBack()`
 * ourselves.
 */
export function BackButtonWithMenu(props: HeaderBackButtonProps) {
  const navigation = useNavigation();
  return (
    <View style={styles.row}>
      <HamburgerButton />
      <HeaderBackButton {...props} onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
