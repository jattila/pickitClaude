import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendEmailVerification } from '@react-native-firebase/auth';
import { auth } from '../services/firebase';
import { refreshEmailVerified, useAuthStore } from '../store/authStore';
import { provisionVerifiedAccount } from '../services/provisioning';
import { signOutFully } from '../services/session';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Stands in for the whole app while a signed-in user's email is unconfirmed.
 *
 * It is a full replacement rather than a banner because an unverified account
 * has no Firestore access at all under the current rules — every list, item and
 * catalog read would come back empty, which reads as data loss rather than as
 * "finish signing up". Guests (no account) never see this.
 */
export function EmailVerificationGate() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { isConnected } = useNetworkStatus();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setError(null);
    setNotice(null);
    setChecking(true);
    try {
      const verified = await refreshEmailVerified();
      if (!verified) {
        setNotice('Még nem érkezett meg a megerősítés. Nézd meg a leveleződ, a spam mappát is.');
        return;
      }
      // First verified moment: this is where the account's Firestore side gets
      // created and any guest data moves up. Failing here would leave a
      // verified user with no profile, so it is surfaced rather than swallowed.
      const current = auth.currentUser;
      if (current) await provisionVerifiedAccount(current);
    } catch {
      setError('Nem sikerült ellenőrizni. Próbáld újra.');
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const current = auth.currentUser;
      if (current) await sendEmailVerification(current);
      setNotice('Elküldtük újra a megerősítő e-mailt.');
    } catch {
      // Firebase throttles repeated sends; that is the common failure here.
      setError('Nem sikerült elküldeni. Várj egy kicsit, és próbáld újra.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>Erősítsd meg az e-mail címed</Text>

      <Text style={styles.body}>
        Küldtünk egy levelet ide:{'\n'}
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </Text>
      <Text style={styles.body}>
        Kattints benne a linkre, aztán gyere vissza ide. Erre azért van szükség, hogy a listáid
        biztonságban legyenek, és csak valódi fiókok férjenek hozzá.
      </Text>

      {!isConnected ? (
        <Text style={styles.error}>Nincs internetkapcsolat — az ellenőrzéshez kapcsolat kell.</Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (checking || !isConnected) && styles.buttonDisabled]}
        onPress={check}
        disabled={checking || !isConnected}
      >
        <Text style={styles.buttonLabel}>{checking ? 'Ellenőrzés…' : 'Megerősítettem'}</Text>
      </Pressable>

      <Pressable onPress={resend} disabled={resending || !isConnected}>
        <Text style={[styles.link, (resending || !isConnected) && styles.linkDisabled]}>
          {resending ? 'Küldés…' : 'Küldd újra az e-mailt'}
        </Text>
      </Pressable>

      <View style={styles.spacer} />

      <Pressable onPress={() => signOutFully()} disabled={!isConnected}>
        <Text style={[styles.secondaryLink, !isConnected && styles.linkDisabled]}>Kijelentkezés</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    color: '#555',
    lineHeight: 21,
  },
  email: {
    fontWeight: '600',
    color: '#333',
  },
  notice: {
    color: '#4A7A4A',
    fontSize: 13,
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
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  link: {
    color: '#4A90D9',
    textAlign: 'center',
    marginTop: 8,
  },
  linkDisabled: {
    opacity: 0.4,
  },
  secondaryLink: {
    color: '#888',
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
});
