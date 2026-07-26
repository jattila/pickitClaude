import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, View } from 'react-native';

/**
 * How much bottom padding a container needs so the keyboard doesn't cover its
 * last child — measured, not inferred.
 *
 * Android here never resizes its window for the keyboard (verified on device:
 * window height is identical before and after), so the whole gap has to be
 * padded by the app. KeyboardAvoidingView computes this from its own frame,
 * which stops above the bottom tab bar, so it consistently came up short.
 * Measuring the container's real distance to the bottom of the screen sidesteps
 * that: whatever sits below it — tab bar, gesture inset — is accounted for by
 * construction.
 *
 * iOS resizes nothing either, but KeyboardAvoidingView handles it correctly
 * there, so this returns 0 and leaves that path alone.
 *
 * Attach `ref` to the element that must stay visible (the input row) and apply
 * `inset` as padding on its scrolling container. Measurement only happens while
 * the inset is 0, so applying it can't feed back into the next measurement.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  // Kept in a ref so the measure callback isn't re-created per keyboard event.
  const keyboardHeight = useRef(0);

  const measure = useCallback(() => {
    if (keyboardHeight.current === 0) {
      setInset(0);
      return;
    }
    ref.current?.measureInWindow((_x, y, _width, height) => {
      const distanceToBottom = Dimensions.get('window').height - (y + height);
      setInset(Math.max(0, keyboardHeight.current - distanceToBottom));
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeight.current = event.endCoordinates.height;
      measure();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeight.current = 0;
      setInset(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure]);

  return { ref, inset };
}
