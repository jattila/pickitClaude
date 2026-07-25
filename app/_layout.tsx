import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { HamburgerMenu } from '../src/components/HamburgerMenu';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { NoticeDialog } from '../src/components/NoticeDialog';
import { usePushRegistration } from '../src/hooks/usePushRegistration';
import { useReturnHomeOnSignOut } from '../src/hooks/useReturnHomeOnSignOut';
import '../src/store/authStore';

export default function RootLayout() {
  usePushRegistration();
  useReturnHomeOnSignOut();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerTitleAlign: 'center' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <HamburgerMenu />
        <OfflineBanner />
        <NoticeDialog />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
