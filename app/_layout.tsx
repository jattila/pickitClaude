import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router';
import { HamburgerMenu } from '../src/components/HamburgerMenu';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { NoticeDialog } from '../src/components/NoticeDialog';
import { usePushRegistration } from '../src/hooks/usePushRegistration';
import { useReturnHomeOnSignOut } from '../src/hooks/useReturnHomeOnSignOut';
import { usePresence } from '../src/hooks/usePresence';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import '../src/store/authStore';

/**
 * Lives inside SafeAreaProvider so it can read the insets, and owns the offline
 * banner's effect on layout: while the banner is up it occupies the status bar
 * area itself, so the navigator is told the top inset is 0. Without that the
 * headers would inset a second time and leave a blank strip under the banner.
 */
function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();

  return (
    <View style={{ flex: 1 }}>
      {isConnected ? null : <OfflineBanner />}
      <SafeAreaInsetsContext.Provider value={isConnected ? insets : { ...insets, top: 0 }}>
        {/*
          Headers are off by default here and turned on per screen. Declaring
          only `(tabs)` as hidden wasn't enough: reaching a tab route from
          outside — redeeming an invite replaces the join screen with a group
          route — matched it under a different key, and the fallback header
          rendered the route name, "(tabs)", as the title.

          The tab screens bring their own headers anyway; only these standalone
          ones need one, and they need it for the back button.
        */}
        <Stack screenOptions={{ headerTitleAlign: 'center', headerShown: false }}>
          <Stack.Screen name="sign-in" options={{ headerShown: true, title: 'Bejelentkezés' }} />
          <Stack.Screen name="sign-up" options={{ headerShown: true, title: 'Regisztráció' }} />
          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: true, title: 'Elfelejtett jelszó' }}
          />
          <Stack.Screen name="join/[code]" options={{ headerShown: true, title: 'Csatlakozás' }} />
        </Stack>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

export default function RootLayout() {
  usePushRegistration();
  useReturnHomeOnSignOut();
  usePresence();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AppNavigator />
          <HamburgerMenu />
          <NoticeDialog />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
