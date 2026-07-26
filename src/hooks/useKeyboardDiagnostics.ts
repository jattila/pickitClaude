import { useEffect } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * TEMPORARY. Logs what the keyboard actually does on this device, to settle
 * whether the Android window resizes for the IME — the behaviour the layout
 * fix depends on, and which guessing has so far got wrong twice.
 */
export function useKeyboardDiagnostics(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const log = (label: string, keyboardHeight?: number) => {
      const screen = Dimensions.get('screen');
      const window = Dimensions.get('window');
      console.log(
        `[KB] ${label} | screen.h=${screen.height} window.h=${window.height} ` +
          `diff=${screen.height - window.height} keyboard=${keyboardHeight ?? '-'}`
      );
    };

    log('mount');
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      log('didShow', e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => log('didHide'));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
}
