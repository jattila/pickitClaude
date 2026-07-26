import { Platform } from 'react-native';

/**
 * iOS only. With react-native-keyboard-controller in place, Android genuinely
 * resizes the window for the keyboard again — the header stays put and the
 * content area shrinks on its own — so padding on top of that compensates a
 * second time and pushes the input clean out of view. iOS resizes nothing and
 * still needs it.
 */
export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? ('padding' as const) : undefined;

export function keyboardVerticalOffset(headerHeight: number): number {
  return Platform.OS === 'ios' ? headerHeight : 0;
}
