import { Stack } from 'expo-router';
import { BackButtonWithMenu } from '../../../src/components/BackButtonWithMenu';

/**
 * Nested Stack behind the "Áttekintés" tab, so drilling into a list or a
 * group keeps a real back button/push animation while staying inside the
 * Tabs navigator — the bottom tab bar stays visible the whole way down.
 * Every non-root screen gets the hamburger button ahead of the native back
 * arrow (BackButtonWithMenu); the root ("index") screen overrides this with
 * just the hamburger, since it has no "back" to show.
 */
export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerLeft: (props) => <BackButtonWithMenu {...props} />,
      }}
    />
  );
}
