import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCatalogSuggestions } from '../hooks/useCatalogSuggestions';
import { lowercaseFirstChar, toDisplayName } from '../services/normalize';

interface ItemNameInputProps {
  listId: string | null;
  onSubmit: (name: string, quantity: string | null) => void;
  /** Catalog ids already on the list — filtered out of the suggestions. */
  excludeIds?: string[];
  /** Names the catalog scope directly, for group screens. */
  groupId?: string | null;
}

export function ItemNameInput({ listId, onSubmit, excludeIds, groupId }: ItemNameInputProps) {
  const [value, setValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const allSuggestions = useCatalogSuggestions(value, groupId);
  const suggestions = excludeIds?.length
    ? allSuggestions.filter((s) => !excludeIds.includes(s.id))
    : allSuggestions;

  const submit = (name: string) => {
    const trimmed = toDisplayName(name);
    if (!trimmed) return;
    onSubmit(trimmed, quantity.trim() || null);
    setValue('');
    setQuantity('');
  };

  return (
    <View>
      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              style={styles.suggestionRow}
              onPress={() => submit(suggestion.name)}
            >
              <Text style={styles.suggestionText}>{suggestion.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={(text) => setValue(lowercaseFirstChar(text))}
          placeholder="Új tétel neve…"
          style={styles.input}
          autoCapitalize="none"
          onSubmitEditing={() => submit(value)}
          returnKeyType="done"
        />
        {/* Free text, not numeric: "2 kg" and "1 doboz" are as common as "2". */}
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="mennyi"
          style={styles.quantityInput}
          autoCapitalize="none"
          onSubmitEditing={() => submit(value)}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={() => submit(value)}>
          <Text style={styles.addButtonLabel}>Hozzáad</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  quantityInput: {
    width: 74,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonLabel: {
    color: 'white',
    fontWeight: '600',
  },
  suggestions: {
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
});
