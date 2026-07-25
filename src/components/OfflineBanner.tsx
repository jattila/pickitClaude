import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Global "you're offline" indicator. List/item edits keep working while
 * offline (Firestore's own offline persistence queues them), so this is
 * informational only — it doesn't block anything by itself. Screens that
 * need a live connection (auth, invites) gate their own actions separately
 * via useNetworkStatus.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>Nincs internetkapcsolat — a változtatások szinkronizálódnak, ha újra online leszel.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D9534F',
    paddingBottom: 6,
    paddingHorizontal: 14,
    zIndex: 50,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
