import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HamburgerButton } from '../../src/components/HamburgerButton';
import { resolveCatalogPath } from '../../src/utils/catalogPath';

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: 'center',
        headerLeft: () => <HamburgerButton />,
        tabBarActiveTintColor: '#4A90D9',
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Áttekintés',
          tabBarLabel: 'Áttekintés',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Katalógus',
          tabBarLabel: 'Katalógus',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetags-outline" size={size} color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            // While browsing a group, this tab should open THAT group's
            // catalog, not always the personal one.
            const target = resolveCatalogPath(pathname);
            if (target !== '/catalog') {
              e.preventDefault();
              router.push(target as any);
            }
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Beállítások',
          tabBarLabel: 'Beállítások',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
