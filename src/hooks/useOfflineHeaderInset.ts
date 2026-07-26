import { useNetworkStatus } from './useNetworkStatus';

/**
 * Header options that keep the offline banner from leaving a blank strip.
 *
 * The banner sits in the flow above the navigators and takes the status bar
 * area for itself, so headers must not reserve it a second time. Overriding
 * SafeAreaInsetsContext doesn't reach them: with react-native-screens the
 * header's status bar allowance is handled natively, and `headerStatusBarHeight`
 * is the knob that actually controls it.
 *
 * Every navigator that renders a header needs this — which one is visible
 * depends on the screen.
 */
export function useOfflineHeaderInset(): { headerStatusBarHeight?: number } {
  const { isConnected } = useNetworkStatus();
  return isConnected ? {} : { headerStatusBarHeight: 0 };
}
