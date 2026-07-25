import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Set on the sign-up screen so password managers offer to generate/save a new one. */
  newPassword?: boolean;
  onSubmitEditing?: () => void;
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Jelszó',
  newPassword,
  onSubmitEditing,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!visible}
        // Without these, revealing the password lets the keyboard autocorrect
        // or capitalize it — silently changing what the user typed.
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType={newPassword ? 'newPassword' : 'password'}
        autoComplete={newPassword ? 'new-password' : 'current-password'}
        onSubmitEditing={onSubmitEditing}
        style={styles.input}
      />
      <Pressable
        onPress={() => setVisible((prev) => !prev)}
        hitSlop={8}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors the plain `input` style on the auth screens, with the border moved
  // out to the wrapper so the icon sits inside the same box.
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  toggle: {
    padding: 4,
  },
});
