import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { HomeScope } from '../hooks/useHomeScopes';

interface ScopeSelectorProps {
  scopes: HomeScope[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/**
 * Picks which shopping list the home screen is showing — your own, or one a
 * group shares.
 *
 * Renders nothing at all with a single scope, which is every user until they
 * share something. Adding a permanently-visible control for a choice that does
 * not exist yet would make the app look more complicated than it is.
 *
 * Horizontally scrollable because group names are free text: "Kovács Család" and
 * "Bíró–Szabó nyaraló" cannot both be made to fit, and truncating the name of
 * the list you are about to add to is worse than a scroll.
 */
export function ScopeSelector({ scopes, selectedKey, onSelect }: ScopeSelectorProps) {
  if (scopes.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
    >
      {scopes.map((scope) => {
        const selected = scope.key === selectedKey;
        return (
          <Pressable
            key={scope.key}
            onPress={() => onSelect(scope.key)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {scope.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#EFEFEF',
  },
  chipSelected: {
    backgroundColor: '#4A90D9',
  },
  label: {
    fontSize: 14,
    color: '#555',
    maxWidth: 180,
  },
  labelSelected: {
    color: 'white',
    fontWeight: '600',
  },
});
