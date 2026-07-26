import { Platform } from 'react-native';

/**
 * Both platforms need KeyboardAvoidingView, but only iOS needs the offset.
 *
 * On iOS the view sits below a header that KeyboardAvoidingView doesn't know
 * about, so the header's height has to be added or the input lands under the
 * keyboard. On Android the header is already accounted for, and adding it
 * again lifted the input roughly a header's height too high.
 */
export const keyboardAvoidingBehavior = Platform.OS === 'ios' ? ('padding' as const) : ('height' as const);

export function keyboardVerticalOffset(headerHeight: number): number {
  return Platform.OS === 'ios' ? headerHeight : 0;
}
