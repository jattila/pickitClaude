import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/** Breathing room between the field and the keyboard. */
const GAP = 8;
/** Stop adjusting once we're within a point of the target. */
const TOLERANCE = 1;
/** Guards against a layout that never settles. */
const MAX_CORRECTIONS = 5;

/**
 * Bottom padding that keeps `ref` clear of the Android keyboard.
 *
 * Nothing the system reports can be trusted to compute this in one shot. On a
 * Galaxy S24+ the window never resizes, the reported keyboard height is ~48pt
 * short of what it occupies, and the vendor toolbar above the keys isn't
 * counted at all — every KeyboardAvoidingView that trusts those figures leaves
 * the field behind the keyboard.
 *
 * So this doesn't predict the value, it converges on it: apply a correction,
 * let the layout settle, measure where the row actually landed, correct again.
 * `onLayout` drives each round; a couple of passes are enough, and the counter
 * stops it from looping if a layout never settles.
 *
 * iOS returns 0 — KeyboardAvoidingView is correct there.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);
  // Mirrors `inset` for the measure callback, which must read the value applied
  // right now rather than whatever was captured when it was created.
  const appliedInset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const corrections = useRef(0);

  const correct = useCallback(() => {
    if (Platform.OS !== 'android' || keyboardTop.current === null) return;
    if (corrections.current >= MAX_CORRECTIONS) return;

    ref.current?.measureInWindow((_x, y, _width, height) => {
      const target = keyboardTop.current;
      if (target === null) return;
      const overshoot = y + height - (target - GAP);
      if (Math.abs(overshoot) <= TOLERANCE) return;

      corrections.current += 1;
      const next = Math.max(0, appliedInset.current + overshoot);
      appliedInset.current = next;
      setInset(next);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      corrections.current = 0;
      correct();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      corrections.current = 0;
      appliedInset.current = 0;
      setInset(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [correct]);

  return { ref, inset, onLayout: correct };
}
