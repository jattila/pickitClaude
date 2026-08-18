import { Pressable, StyleSheet, Text, View } from 'react-native';

interface GuestListNoticesProps {
  /** Decides whether the offer is registration or signing back in. */
  hadAccountHere: boolean;
  /** Opens whichever of the two screens the offer names. */
  onPress: () => void;
}

/**
 * What a guest with a list on the screen needs to know, in two parts.
 *
 * They are a pair on purpose. The first is an offer and leads somewhere; the
 * second is a fact about what happens if the offer is ignored. Merging them
 * would make the whole thing read as either a nag or a button, and neither is
 * what a person with a half-written shopping list wants above it.
 */
export function GuestListNotices({ hadAccountHere, onPress }: GuestListNoticesProps) {
  return (
    <View>
      <Pressable style={styles.offer} onPress={onPress}>
        <Text style={styles.offerText}>
          {hadAccountHere
            ? 'Ezen a telefonon volt már bejelentkezve fiók — lépj be, és újra eléred a felhőben tárolt listáidat.'
            : 'Regisztrálj és a listád felkerül a felhőbe és bármelyik telefonodról elérhető lesz, ha bejelentkezel.'}
        </Text>
      </Pressable>

      {/* Deliberately not tappable. It states a consequence rather than offering
          a way out, and if it led to the same screen as the notice above, the
          two would read as one oversized button. */}
      <View style={styles.warning}>
        <Text style={styles.warningText}>
          <Text style={styles.warningLead}>
            Amit bejelentkezés nélkül írsz fel, csak ezen a telefonon marad meg.
          </Text>{' '}
          Egy későbbi bejelentkezés nem viszi magával, és az app törlésével elveszik.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offer: {
    backgroundColor: '#EAF2FB',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  offerText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#3A6690',
  },
  // Amber against the notice's blue, so the pair reads as "here is the offer"
  // followed by "and here is what happens if you don't take it".
  warning: {
    backgroundColor: '#FBF6E7',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A7A4A',
  },
  warningLead: {
    fontWeight: '700',
    color: '#6E5F33',
  },
});
