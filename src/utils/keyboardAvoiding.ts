import { Platform } from 'react-native';

/**
 * iOS only. On Android every KeyboardAvoidingView — React Native's and
 * keyboard-controller's — lifts by the keyboard height the system reports,
 * which is ~58pt short of what it actually occupies, leaving the field behind
 * it. `useKeyboardInset` measures against the keyboard's real top edge instead.
 */
export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? ('padding' as const) : undefined;

export function keyboardVerticalOffset(headerHeight: number): number {
  return Platform.OS === 'ios' ? headerHeight : 0;
}
