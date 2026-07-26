import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Global "you're offline" indicator. List/item edits keep working while
 * offline (Firestore's own offline persistence queues them), so this is
 * informational only — it doesn't block anything by itself. Screens that
 * need a live connection (auth, invites) gate their own actions separately
 * via useNetworkStatus.
 *
 * Laid out in the normal flow above the navigator rather than floating over
 * it: as an overlay it sat on top of the screen header and hid the title and
 * the back button. Sitting in the flow, it takes the status bar area for
 * itself and pushes the app down — see RootLayout, which zeroes the top inset
 * for the navigator while this is showing so the header doesn't inset twice.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>
        Nincs internetkapcsolat — a változtatások szinkronizálódnak, ha újra online leszel.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D9534F',
    paddingBottom: 6,
    paddingHorizontal: 14,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
