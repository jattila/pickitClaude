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

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = KeyboardEvents.addListener('keyboardDidShow', (event) => {
      // Measured while the inset is 0, so it can't feed back into itself.
      ref.current?.measureInWindow((_x, y, _width, height) => {
        const belowRow = Dimensions.get('window').height - (y + height);
        const overlap = event.height - belowRow;
        setInset(overlap > 0 ? overlap + GAP + VENDOR_TOOLBAR_ALLOWANCE : 0);
      });
    });
    const hide = KeyboardEvents.addListener('keyboardDidHide', () => setInset(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { ref, inset };
}
