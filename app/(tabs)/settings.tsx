import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from '@react-native-firebase/auth';
import { auth } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/authStore';
import { PromptDialog } from '../../src/components/PromptDialog';
import { ChoiceRow, ToggleRow } from '../../src/components/SettingRows';
import { useEditableUserSettings } from '../../src/hooks/useUserSettings';

const WINDOW_OPTIONS = [
  { value: 15, label: '15 perc' },
  { value: 30, label: '30 perc' },
  { value: 60, label: '1 óra' },
  { value: 180, label: '3 óra' },
];

const DIGEST_OPTIONS = [
  { value: 30, label: '30 perc' },
  { value: 60, label: '1 óra' },
  { value: 180, label: '3 óra' },
  { value: 720, label: '12 óra' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { settings, updateSettings } = useEditableUserSettings();
  const [enteringCode, setEnteringCode] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

          <Text style={styles.sectionHeader}>Értesítések</Text>
          <View style={styles.card}>
            <ToggleRow
              label="Figyelmeztetés friss vásárlásra"
              hint="Szólok, ha egy csoportos listán valaki más nemrég bejelölt egy tételt."
              value={settings.recentPurchaseWarningEnabled}
              onValueChange={(value) => updateSettings({ recentPurchaseWarningEnabled: value })}
            />
            <View style={styles.divider} />
            <ChoiceRow
              label="Mennyire számít frissnek"
              hint="Ennél régebbi vásárlásokra már nem figyelmeztetlek."
              options={WINDOW_OPTIONS}
              value={settings.recentPurchaseWindowMinutes}
              onSelect={(value) => updateSettings({ recentPurchaseWindowMinutes: value })}
              disabled={!settings.recentPurchaseWarningEnabled}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="Összefoglaló értesítés"
              hint="Időnként egy push üzenetben összesítem a csoportjaid változásait."
              value={settings.digestEnabled}
              onValueChange={(value) => updateSettings({ digestEnabled: value })}
            />
            <View style={styles.divider} />
            <ChoiceRow
              label="Milyen gyakran"
              options={DIGEST_OPTIONS}
              value={settings.digestIntervalMinutes}
              onSelect={(value) => updateSettings({ digestIntervalMinutes: value })}
              disabled={!settings.digestEnabled}
            />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Padding belongs on the content container, not the ScrollView itself.
  content: {
    padding: 20,
    // sectionHeader carries its own top margin, so the first one supplies the
    // top inset — otherwise it would be doubled.
    paddingTop: 0,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginVertical: 2,
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
