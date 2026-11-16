import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useGroups } from '../../src/hooks/useGroups';
import { useUiStore } from '../../src/store/uiStore';
import { CatalogView } from '../../src/components/CatalogView';

/**
 * Opens the catalog behind whichever list the person was last typing into —
 * their own, or the group's when that list is shared — so editing a suggestion
 * here changes the suggestions they actually see.
 */
export default function CatalogScreen() {
  const scopeId = useUiStore((state) => state.catalogGroupId);
  const { groups, loading: groupsLoading } = useGroups();

  // Only a group the person still belongs to. A scope left over from a group
  // they have since left, or from before signing out, falls back to their own
  // catalog rather than to a read the rules would refuse.
  const group = scopeId ? (groups.find((g) => g.id === scopeId) ?? null) : null;

  // Without this wait the personal catalog would load first and be swapped for
  // the group's a moment later, which reads as the list changing under you.
  if (scopeId && groupsLoading) return <View style={styles.placeholder} />;

  return (
    <>
      <Tabs.Screen options={{ title: group ? `${group.name} katalógusa` : 'Katalógus' }} />
      {/* Keyed by scope so switching catalogs starts from an empty screen
          instead of showing the previous catalog until the new one arrives. */}
      <CatalogView key={group?.id ?? 'personal'} groupId={group?.id ?? null} />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});
