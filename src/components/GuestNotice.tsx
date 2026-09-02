import { Pressable, StyleSheet, Text, View } from 'react-native';

interface GuestNoticeProps {
  /**
   * `offer` is the standing invitation to get a cloud copy; `warning` is what it
   * escalates to once there is something on the phone that could be lost.
   */
  mode: 'offer' | 'warning';
  /** Decides whether the closing sentence points at registering or signing in. */
  hadAccountHere: boolean;
  /** Opens whichever of the two screens that sentence names. */
  onPress: () => void;
  /** Only meaningful in `warning` mode — the offer has nothing to dismiss. */
  onDismiss?: () => void;
}

/**
 * The one line above a guest's list, in two strengths.
 *
 * It starts as an offer and becomes a warning the moment there is an item or a
 * list to lose. Closing the warning steps back to the offer rather than clearing
 * the space entirely: the ✕ means "I know, stop warning me", not "never mention
 * the cloud again" — and someone using the app as a guest should always have the
 * way to a cloud copy within reach.
 */
export function GuestNotice({ mode, hadAccountHere, onPress, onDismiss }: GuestNoticeProps) {
  const warning = mode === 'warning';

  const closing = hadAccountHere
    ? 'Ezen a telefonon volt már bejelentkezve fiók — lépj be, és újra eléred a felhőben tárolt listáidat.'
    : 'Regisztrálj és a listád felkerül a felhőbe és bármelyik telefonodról elérhető lesz, ha bejelentkezel.';

  return (
    <View style={[styles.bar, warning ? styles.barWarning : styles.barOffer]}>
      {/* The body leads somewhere: the text asks for something, and making
          someone hunt for the header button afterwards would be a small rudeness. */}
      <Pressable style={styles.textArea} onPress={onPress}>
        <Text style={[styles.text, warning ? styles.textWarning : styles.textOffer]}>
          {warning ? (
            <>
              <Text style={styles.lead}>
                Amit Regisztráció/Bejelentkezés nélkül veszel fel, az csak ezen a telefonon létezik
                és elveszhet.
              </Text>{' '}
            </>
          ) : null}
          {closing}
        </Text>
      </Pressable>

      {/* Its own Pressable with a generous hitSlop, so closing the bar never
          fires the navigation underneath it. */}
      {warning && onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Bezárás"
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  barOffer: {
    backgroundColor: '#EAF2FB',
  },
  barWarning: {
    backgroundColor: '#FBF6E7',
  },
  textArea: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
  },
  textOffer: {
    color: '#3A6690',
  },
  textWarning: {
    color: '#8A7A4A',
  },
  lead: {
    fontWeight: '700',
    color: '#6E5F33',
  },
  close: {
    fontSize: 15,
    lineHeight: 19,
    color: '#8A7A4A',
  },
});
