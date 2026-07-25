import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from '@react-native-firebase/auth';
import { auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/authStore';
import { PromptDialog } from '../../src/components/PromptDialog';

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [enteringCode, setEnteringCode] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Fiók</Text>

      {user ? (
        <View style={styles.card}>
          <Text style={styles.email}>{user.email}</Text>
          <Pressable style={styles.button} onPress={() => signOut(auth)}>
            <Text style={styles.buttonLabel}>Kijelentkezés</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.guestText}>
            Jelenleg vendégként használod az appot — a listáid csak ezen a készüléken élnek.
          </Text>
          <Pressable style={styles.button} onPress={() => router.push('/sign-up')}>
            <Text style={styles.buttonLabel}>Regisztráció</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/sign-in')}>
            <Text style={styles.secondaryButtonLabel}>Már van fiókom</Text>
          </Pressable>
        </View>
      )}

      {user ? (
        <>
          <Text style={styles.sectionHeader}>Csoportok</Text>
          <View style={styles.card}>
            <Pressable style={styles.button} onPress={() => setEnteringCode(true)}>
              <Text style={styles.buttonLabel}>Csatlakozás meghívó kóddal</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <PromptDialog
        visible={enteringCode}
        title="Meghívó kód"
        placeholder="pl. AB2C3D4E"
        onCancel={() => setEnteringCode(false)}
        onConfirm={(code) => {
          setEnteringCode(false);
          router.push(`/join/${code.trim().toUpperCase()}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  email: {
    fontSize: 15,
    fontWeight: '500',
  },
  guestText: {
    fontSize: 14,
    color: '#555',
  },
  button: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#4A90D9',
  },
});
