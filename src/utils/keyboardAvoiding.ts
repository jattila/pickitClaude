import { Platform } from 'react-native';

/**
 * iOS only. KeyboardAvoidingView computes the gap from its own frame, which on
 * Android stops above the bottom tab bar, so it always came up short there —
 * `useKeyboardInset` measures the real distance instead. Leaving this enabled
 * on Android would stack a second, wrong compensation on top of that one.
 *
 * The offset covers the header, which sits outside the frame the view knows
 * about on iOS.
 */
export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? ('padding' as const) : undefined;

export function keyboardVerticalOffset(headerHeight: number): number {
  return Platform.OS === 'ios' ? headerHeight : 0;
}
