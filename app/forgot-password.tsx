import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendPasswordResetEmail } from '@react-native-firebase/auth';
import { auth } from '../src/services/firebase';

export default function ForgotPasswordScreen() {
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
    <View style={styles.container}>
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
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.button} onPress={submit}>
            <Text style={styles.buttonLabel}>Visszaállító email küldése</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'white',
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
