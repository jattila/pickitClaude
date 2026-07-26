import { Platform } from 'react-native';

/**
 * Both platforms now use padding, via react-native-keyboard-controller's
 * KeyboardAvoidingView rather than React Native's. The built-in one derives the
 * keyboard's extent from values Android under-reports — vendor toolbars aren't
 * included — which is why every purely-JS attempt landed the input behind
 * Samsung's toolbar strip. The library reads the real IME insets instead.
 */
export const keyboardAvoidingBehavior = 'padding' as const;

export function keyboardVerticalOffset(headerHeight: number): number {
  return Platform.OS === 'ios' ? headerHeight : 0;
}
