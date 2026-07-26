import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/** Small breathing room so the field doesn't sit flush against the keyboard. */
const GAP = 8;

/**
 * Bottom padding needed to keep `ref` clear of the Android keyboard.
 *
 * Everything else available under-reports the keyboard. Measured on a Galaxy
 * S24+: the window never resizes (832 before and after), the reported keyboard
 * height is 310 while it actually occupies 358 on screen, and
 * KeyboardAvoidingView — React Native's and keyboard-controller's alike — lifts
 * by the short figure, leaving the field ~58pt behind the keyboard.
 *
 * `endCoordinates.screenY` is the one value that matches what's drawn, so the
 * padding comes from the measured distance between the row and that edge.
 *
 * iOS returns 0: KeyboardAvoidingView handles it correctly there.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      // Measured while the inset is still 0, so it can't feed back into itself.
      ref.current?.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height - keyboardTop;
        setInset(overlap > 0 ? overlap + GAP : 0);
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setInset(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { ref, inset };
}
