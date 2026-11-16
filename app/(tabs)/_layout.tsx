import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HamburgerButton } from '../../src/components/HamburgerButton';

export default function TabsLayout() {
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
