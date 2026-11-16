import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendEmailVerification } from '@react-native-firebase/auth';
import { auth } from '../services/firebase';
import { refreshEmailVerified, useAuthStore } from '../store/authStore';
import { provisionVerifiedAccount } from '../services/provisioning';
import { signOutFully } from '../services/session';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useHasLocalData } from '../hooks/useHasLocalData';
import * as Linking from 'expo-linking';
import { rememberPendingInvite } from '../data/local/pendingInvite';
import { inviteCodeFromUrl } from '../utils/inviteMessage';

// The last link already set aside. useURL keeps returning the most recent link
// for the life of the process, so without this a gate shown again later — for
// another account on the same phone — would revive an invite already used.
let rememberedUrl: string | null = null;

/**
 * Says why a resend failed, because the fixes differ. Throttling — Firebase
 * allows only a few verification mails per account in a short window, the one
 * sent at registration included — is fixed by waiting, and meanwhile the first
 * mail is usually sitting in spam. A deleted or disabled account is fixed by
 * no amount of waiting.
 */
function resendErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/too-many-requests':
      return 'Nemrég már küldtünk levelet erre a címre, ezért most nem küldhetünk újat. Nézd meg a spam mappát is, vagy kérd újra néhány perc múlva.';
    case 'auth/network-request-failed':
      return 'Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatot.';
    case 'auth/user-not-found':
    case 'auth/user-disabled':
    case 'auth/user-token-expired':
    case 'auth/invalid-user-token':
      return 'Ez a fiók már nem érvényes. Jelentkezz ki, és regisztrálj vagy lépj be újra.';
    default:
      return 'Nem sikerült elküldeni. Várj egy kicsit, és próbáld újra.';
  }
}

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
  const hasGuestList = useHasLocalData();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // An invite link tapped while this screen is up has nowhere to land: the
  // app's routes are not mounted until the address is confirmed. Set aside for
  // usePendingInviteResume to reopen afterwards, instead of being dropped.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url || url === rememberedUrl) return;
    const code = inviteCodeFromUrl(url);
    if (!code) return;
    rememberedUrl = url;
    rememberPendingInvite(code).catch(() => undefined);
  }, [url]);

  // The link is clicked in the mail app, and nothing tells this one. Checked
  // again whenever the app comes back to the front — and once on opening, which
  // covers a relaunch after the link was clicked — so the screen lifts by
  // itself instead of waiting for "Megerősítettem". The root provisioning hook
  // picks up from there, as it does after the button.
  useEffect(() => {
    if (!isConnected) return;
    const quietCheck = () => {
      refreshEmailVerified().catch((e: any) => {
        if (__DEV__) console.warn('[verify] check failed:', e?.code, e?.message);
      });
    };
    quietCheck();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') quietCheck();
    });
    return () => subscription.remove();
  }, [isConnected]);

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
    } catch (e: any) {
      if (__DEV__) console.warn('[verify] resend failed:', e?.code, e?.message);
      setError(resendErrorMessage(e?.code));
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

      {/* This screen replaces the whole app, so someone who had a guest list is
          suddenly looking at a wall of text where their shopping list used to
          be. Nothing has happened to it — the migration has not even run yet —
          but that needs saying, along with the way back. */}
      {hasGuestList ? (
        <Text style={styles.reassurance}>
          A mostani bevásárlólistád a telefonon van, biztonságban. A megerősítés után kerül a
          felhőbe. Ha most kijelentkezel, azonnal visszakapod.
        </Text>
      ) : null}

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
  reassurance: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3D6B3D',
    backgroundColor: '#EFF6EF',
    borderRadius: 8,
    padding: 12,
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
