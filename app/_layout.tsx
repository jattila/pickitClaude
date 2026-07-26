import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router';
import { HamburgerMenu } from '../src/components/HamburgerMenu';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { NoticeDialog } from '../src/components/NoticeDialog';
import { usePushRegistration } from '../src/hooks/usePushRegistration';
import { useReturnHomeOnSignOut } from '../src/hooks/useReturnHomeOnSignOut';
import { usePresence } from '../src/hooks/usePresence';
import '../src/store/authStore';

export default function RootLayout() {
  usePushRegistration();
  useReturnHomeOnSignOut();
  usePresence();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          {/*
            Headers are off by default here and turned on per screen. Declaring
            only `(tabs)` as hidden wasn't enough: reaching a tab route from
            outside — redeeming an invite replaces the join screen with a group
            route — matched it under a different key, and the fallback header
            rendered the route name, "(tabs)", as the title.

            The tab screens bring their own headers anyway; only these
            standalone ones need one, and they need it for the back button.
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
          <HamburgerMenu />
          <OfflineBanner />
          <NoticeDialog />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
