import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { getInvitePreview, redeemInvite } from '../../src/services/groups';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { isConnected } = useNetworkStatus();

  const [groupName, setGroupName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isConnected) return;
    getInvitePreview(code)
      .then((preview) => {
        if (!preview) setNotFound(true);
        else setGroupName(preview.groupName);
      })
      .catch(() => setPreviewError('Nem sikerült betölteni a meghívót.'));
  }, [code, user, isConnected]);

  const handleJoin = async () => {
    setError(null);
    setJoining(true);
    try {
      const result = await redeemInvite(code);
      router.replace(`/group/${result.groupId}`);
    } catch (e: any) {
      setError(e?.message ?? 'Nem sikerült csatlakozni.');
    } finally {
      setJoining(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Csatlakozás' }} />
        <Text style={styles.title}>Regisztráció szükséges</Text>
        <Text style={styles.text}>
          Csoporthoz csatlakozáshoz előbb regisztrálnod kell egy fiókot.
        </Text>
        <Pressable style={styles.button} onPress={() => router.push('/sign-up')}>
          <Text style={styles.buttonLabel}>Regisztráció</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/sign-in')}>
          <Text style={styles.link}>Már van fiókom, bejelentkezem</Text>
        </Pressable>
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Csatlakozás' }} />
        <Text style={styles.title}>Érvénytelen meghívó</Text>
        <Text style={styles.text}>Ez a meghívó kód nem található, lejárt, vagy vissza lett vonva.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Csatlakozás' }} />
      {groupName ? (
        <>
          <Text style={styles.title}>Csatlakozol ehhez: "{groupName}"</Text>
          {!isConnected ? (
            <Text style={styles.error}>Nincs internetkapcsolat — a csatlakozáshoz kapcsolat kell.</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.button} onPress={handleJoin} disabled={joining || !isConnected}>
            <Text style={styles.buttonLabel}>{joining ? 'Csatlakozás…' : 'Csatlakozás'}</Text>
          </Pressable>
        </>
      ) : !isConnected ? (
        <Text style={styles.error}>Nincs internetkapcsolat — a meghívó megtekintéséhez kapcsolat kell.</Text>
      ) : previewError ? (
        <Text style={styles.error}>{previewError}</Text>
      ) : (
        <Text style={styles.text}>Betöltés…</Text>
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
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    color: '#D9534F',
    fontSize: 13,
    textAlign: 'center',
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
    fontSize: 15,
  },
  link: {
    color: '#4A90D9',
    textAlign: 'center',
    marginTop: 16,
  },
});
