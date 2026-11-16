import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../src/utils/keyboardAvoiding';
import { useAndroidKeyboardPadding } from '../src/hooks/useKeyboardInset';
import { sendPasswordResetEmail } from '@react-native-firebase/auth';
import { auth } from '../src/services/firebase';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';

export default function ForgotPasswordScreen() {
  const keyboardPadding = useAndroidKeyboardPadding();
  // iOS lifts the form by the keyboard's height measured from the top of the
  // screen, so the header has to be added back or the bottom row stays covered.
  const headerHeight = useHeaderHeight();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e: any) {
      setError('Nem sikerült elküldeni az emailt. Ellenőrizd a címet.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset(headerHeight)}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + keyboardPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Elfelejtett jelszó</Text>

        {sent ? (
          <Text style={styles.info}>Elküldtük a jelszó-visszaállító emailt a(z) {email} címre.</Text>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email cím"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={styles.input}
            />
            {!isConnected ? (
              <Text style={styles.error}>Nincs internetkapcsolat — ehhez kapcsolat kell.</Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.button} onPress={submit} disabled={!isConnected}>
              <Text style={styles.buttonLabel}>Visszaállító email küldése</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    color: '#D9534F',
    fontSize: 13,
  },
  info: {
    fontSize: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
});
