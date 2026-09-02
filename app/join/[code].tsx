import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, type DocumentData } from '@react-native-firebase/firestore';
import { firestore } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/authStore';
import { getInvitePreview, redeemInvite } from '../../src/services/groups';
import { setActiveShoppingList } from '../../src/services/userProfile';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useUiStore } from '../../src/store/uiStore';

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

      // A circle that shares a whole shopping list becomes the one you are
      // shopping on — that is the point of joining. Occasional lists (a party,
      // say) have no mainListId and simply appear as a row instead, so nothing
      // is repointed and nothing needs announcing.
      const groupSnap = await getDoc(doc(firestore, 'groups', result.groupId)).catch(() => null);
      const mainListId = groupSnap?.exists()
        ? ((groupSnap.data() as DocumentData).mainListId ?? null)
        : null;

      if (mainListId && user) {
        await setActiveShoppingList(user.uid, mainListId).catch(() => undefined);
        const listSnap = await getDoc(doc(firestore, 'lists', mainListId)).catch(() => null);
        const listName = listSnap?.exists()
          ? ((listSnap.data() as DocumentData).name ?? result.groupName)
          : result.groupName;
        useUiStore.getState().setJoinedListNotice(listName);
      }

      // Home rather than the circle's screen: what changed is the list you are
      // shopping on, and that is what the home screen shows.
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Nem sikerült csatlakozni.');
    } finally {
      setJoining(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
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
        <Text style={styles.title}>Érvénytelen meghívó</Text>
        <Text style={styles.text}>Ez a meghívó kód nem található, lejárt, vagy vissza lett vonva.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
