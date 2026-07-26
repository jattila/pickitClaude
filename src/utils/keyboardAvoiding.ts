import { Platform } from 'react-native';

/**
 * Android already resizes the window when the keyboard opens — Expo's
 * softwareKeyboardLayoutMode defaults to "resize", i.e. adjustResize — so
 * KeyboardAvoidingView has to stay out of the way there. Giving it a behaviour
 * (and a header-height offset) on Android compensates a second time, which is
 * what pushed the input well above the keyboard instead of onto it.
 *
 * iOS does no such thing, so it still needs both.
 */
export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? ('padding' as const) : undefined;

export function keyboardVerticalOffset(headerHeight: number): number {
  return Platform.OS === 'ios' ? headerHeight : 0;
}
