import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from '@react-native-firebase/auth';
import { auth } from '../src/services/firebase';
import { migrateGuestDataToCloud } from '../src/services/migration';
import { createDefaultUserProfile } from '../src/services/userProfile';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { PasswordInput } from '../src/components/PasswordInput';

export default function SignUpScreen() {
  const router = useRouter();
  const { isConnected } = useNetworkStatus();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Adj meg egy nevet, egy email címet és legalább 6 karakteres jelszót.');
      return;
    }
    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await createDefaultUserProfile(credential.user.uid, email.trim(), name.trim());
      await migrateGuestDataToCloud(credential.user.uid);
      router.replace('/');
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        setError('Ezzel az email címmel már van fiók. Próbálj bejelentkezni helyette.');
      } else if (e?.code === 'auth/invalid-email') {
        setError('Érvénytelen email cím.');
      } else {
        setError('Nem sikerült a regisztráció.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Regisztráció</Text>
        <Text style={styles.subtitle}>
          A meglévő listáid és tételeid automatikusan átkerülnek a fiókodba.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Neved"
          autoCapitalize="words"
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email cím"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder="Jelszó (min. 6 karakter)"
          newPassword
          onSubmitEditing={submit}
        />

        {!isConnected ? (
          <Text style={styles.error}>Nincs internetkapcsolat — a regisztrációhoz kapcsolat kell.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={submit} disabled={submitting || !isConnected}>
          <Text style={styles.buttonLabel}>{submitting ? 'Regisztráció…' : 'Regisztráció'}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/sign-in')}>
          <Text style={styles.link}>Már van fiókom, bejelentkezem</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
