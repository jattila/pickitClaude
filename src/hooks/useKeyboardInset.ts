import { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';

/** Breathing room between the field and the keyboard. */
const GAP = 8;

/**
 * Extra allowance for vendor toolbars drawn above the keyboard.
 *
 * Samsung's keyboard puts an icon strip above the keys that no API accounts
 * for: measured on a Galaxy S24+, keyboard-controller and React Native agree
 * the keyboard window starts at y=473.6, yet the strip is drawn above that and
 * clipped the input row. Since the strip is invisible to every measurement, the
 * only way to clear it is to allow for it.
 *
 * On a keyboard without such a strip this simply leaves a slightly larger gap
 * under the field — visually looser, never broken.
 */
const VENDOR_TOOLBAR_ALLOWANCE = 48;

/**
 * Bottom padding for a scrolling form on Android, so what sits below the
 * focused field — the submit button above all — can come out from under the
 * keyboard.
 *
 * The auth screens centre a short form in a ScrollView. On Android nothing
 * shrinks that ScrollView when the keyboard opens: KeyboardAvoidingView is off
 * there (see keyboardAvoiding.ts), and keyboard-controller keeps the window
 * from resizing. So the keyboard simply covered the lower half. The button
 * under the password field was hidden, and could not be scrolled to either,
 * since as far as the ScrollView knew, everything already fitted.
 *
 * Padding the content by the keyboard's height pulls the centred form up into
 * the part still visible, and on a phone too short for that, makes the rest
 * scrollable. The vendor allowance is the same Samsung strip as below.
 *
 * iOS returns 0 — KeyboardAvoidingView is correct there.
 */
export function useAndroidKeyboardPadding(): number {
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = KeyboardEvents.addListener('keyboardDidShow', (event) =>
      setPadding(event.height + VENDOR_TOOLBAR_ALLOWANCE)
    );
    const hide = KeyboardEvents.addListener('keyboardDidHide', () => setPadding(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return padding;
}

/**
 * Bottom padding that keeps `ref` clear of the Android keyboard.
 *
 * Built on keyboard-controller's events rather than React Native's: RN reports
 * the keyboard as ~48pt shorter than it is, so anything derived from it lands
 * the field behind the keyboard outright.
 *
 * iOS returns 0 — KeyboardAvoidingView is correct there.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  /** What the row is currently lifted by; `inset` itself would be stale here. */
  const applied = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = KeyboardEvents.addListener('keyboardDidShow', (event) => {
      ref.current?.measureInWindow((_x, y, _width, height) => {
        // The measurement already includes the lift currently applied, so it
        // has to come back out before deriving the next one.
        //
        // This fires more than once per session: moving focus between the name
        // and quantity fields keeps the keyboard up but changes its type, and
        // Android reports that as another keyboardDidShow. Measuring a row we
        // had already lifted made the overlap look smaller than it is, so each
        // event shrank the inset and the row sank back behind the keyboard.
        const belowRow = Dimensions.get('window').height - (y + height) - applied.current;
        const overlap = event.height - belowRow;
        const next = overlap > 0 ? overlap + GAP + VENDOR_TOOLBAR_ALLOWANCE : 0;
        applied.current = next;
        setInset(next);
      });
    });
    const hide = KeyboardEvents.addListener('keyboardDidHide', () => {
      applied.current = 0;
      setInset(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { ref, inset };
}
