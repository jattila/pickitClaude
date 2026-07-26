import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Global "you're offline" indicator. List/item edits keep working while
 * offline (Firestore's own offline persistence queues them), so this is
 * informational only — it doesn't block anything by itself. Screens that
 * need a live connection (auth, invites) gate their own actions separately
 * via useNetworkStatus.
 *
 * Sits in the flow at the *bottom* of the app. As a top overlay it covered the
 * screen header — title and back button both — and moving it to the top of the
 * flow instead left a blank strip, because the native header reserves the
 * status bar area itself and no React-side inset override reaches it. There is
 * no header at the bottom to fight with.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.banner, { paddingBottom: insets.bottom + 6 }]} pointerEvents="none">
      <Text style={styles.text}>
        Nincs internetkapcsolat — a változtatások szinkronizálódnak, ha újra online leszel.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D9534F',
    paddingTop: 6,
    paddingHorizontal: 14,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
