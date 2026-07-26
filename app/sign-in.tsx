import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { keyboardAvoidingBehavior } from '../src/utils/keyboardAvoiding';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { auth } from '../src/services/firebase';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { PasswordInput } from '../src/components/PasswordInput';

export default function SignInScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError('Hibás email cím vagy jelszó.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={keyboardAvoidingBehavior}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bejelentkezés</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email cím"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <PasswordInput value={password} onChangeText={setPassword} onSubmitEditing={submit} />

        {!isConnected ? (
          <Text style={styles.error}>Nincs internetkapcsolat — a bejelentkezéshez kapcsolat kell.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={submit} disabled={submitting || !isConnected}>
          <Text style={styles.buttonLabel}>{submitting ? 'Belépés…' : 'Bejelentkezés'}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/forgot-password')}>
          <Text style={styles.link}>Elfelejtett jelszó</Text>
        </Pressable>

        {/* replace rather than push: coming from sign-up, this would otherwise
            stack the two auth screens on top of each other indefinitely. */}
        <Pressable onPress={() => router.replace('/sign-up')}>
          <Text style={styles.link}>Még nincs fiókom, regisztrálok</Text>
        </Pressable>
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
  link: {
    color: '#4A90D9',
    textAlign: 'center',
    marginTop: 16,
  },
});
