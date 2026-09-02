import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { signOutFully } from '../../src/services/session';
import { useAuthStore } from '../../src/store/authStore';
import { PromptDialog } from '../../src/components/PromptDialog';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { ChoiceRow, ToggleRow } from '../../src/components/SettingRows';
import { useEditableUserSettings } from '../../src/hooks/useUserSettings';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useGroups } from '../../src/hooks/useGroups';
import { useLists } from '../../src/hooks/useLists';
import { useSharedLists } from '../../src/hooks/useSharedLists';
import { useShoppingListChoices, type ShoppingListChoice } from '../../src/hooks/useActiveShoppingList';
import { useProfilePointers } from '../../src/hooks/useProfilePointers';
import { setActiveShoppingList } from '../../src/services/userProfile';
import { deleteGroup, leaveGroup, renameGroup } from '../../src/services/groups';
import { FirestoreListsRepository } from '../../src/data/cloud/FirestoreListsRepository';
import { resetDeviceState } from '../../src/services/devReset';

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
  const { isConnected } = useNetworkStatus();
  const [enteringCode, setEnteringCode] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const { groups } = useGroups();
  const { lists: personalLists } = useLists();
  const sharedLists = useSharedLists(groups);
  const choices = useShoppingListChoices(groups, personalLists, sharedLists);
  const { defaultListId } = useProfilePointers();

  const [renamingChoice, setRenamingChoice] = useState<ShoppingListChoice | null>(null);
  const [leavingChoice, setLeavingChoice] = useState<ShoppingListChoice | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const ownerOf = (choice: ShoppingListChoice) =>
    !!choice.groupId && groups.find((g) => g.id === choice.groupId)?.ownerId === user?.uid;

  const chooseList = (choice: ShoppingListChoice) => {
    if (!user || choice.listId === defaultListId) return;
    setActiveShoppingList(user.uid, choice.listId).catch((e: any) =>
      setListError(e?.message ?? 'Nem sikerült váltani.')
    );
  };

  // Renaming a shared list renames its circle too: the circle only ever carried
  // a copy of the list's name, and a stale copy would surface in invitations.
  // Best-effort, because only the circle's owner may write the group document.
  const applyRename = async (choice: ShoppingListChoice, name: string) => {
    await FirestoreListsRepository.renameList(choice.listId, name);
    if (choice.groupId) await renameGroup(choice.groupId, name).catch(() => undefined);
  };

  // Leaving or deleting takes the active list away, so the pointer has to move
  // before the home screen tries to read a list this account can no longer see.
  const applyLeave = async (choice: ShoppingListChoice) => {
    if (!choice.groupId || !user) return;
    const wasActive = choice.listId === defaultListId;
    if (ownerOf(choice)) await deleteGroup(choice.groupId);
    else await leaveGroup(choice.groupId);
    const fallback = choices.find((c) => c.listId !== choice.listId);
    if (wasActive && fallback) await setActiveShoppingList(user.uid, fallback.listId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Fiók</Text>

      {user ? (
        <View style={styles.card}>
          <Text style={styles.email}>{user.email}</Text>
          {/* Signing out offline would strand the user: the local Firestore
              cache is dropped with the session, any writes still queued would
              go with it, and signing back in needs the network they don't
              have. */}
          {!isConnected ? (
            <Text style={styles.hint}>
              Nincs internetkapcsolat — kijelentkezni csak online lehet, különben a még nem
              szinkronizált változtatásaid elvesznének, és visszalépni sem tudnál.
            </Text>
          ) : null}
          <Pressable
            style={[styles.button, !isConnected && styles.buttonDisabled]}
            onPress={() => setConfirmingSignOut(true)}
            disabled={!isConnected}
          >
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
          <Text style={styles.sectionHeader}>Bevásárlólistáim</Text>
          <View style={styles.card}>
            {/* One row per shopping list this account can be *on*. Occasional
                lists are absent on purpose — those live on the home screen as
                rows, and are not somewhere you switch to. */}
            {choices.length > 1 ? (
              choices.map((choice) => {
                const isActive = choice.listId === defaultListId;
                return (
                  <View key={choice.listId}>
                    <Pressable style={styles.listRow} onPress={() => chooseList(choice)}>
                      <View style={styles.listTextColumn}>
                        <Text style={[styles.listName, isActive && styles.listNameActive]}>
                          {choice.name}
                        </Text>
                        <Text style={styles.listHint}>
                          {choice.groupId ? `${choice.memberCount} tag` : 'Csak a tiéd'}
                        </Text>
                      </View>
                      {isActive ? <Text style={styles.listActiveMark}>✓</Text> : null}
                    </Pressable>
                    <View style={styles.listActions}>
                      {choice.groupId ? (
                        <Text
                          style={styles.listAction}
                          onPress={() => router.push(`/group/${choice.groupId}/members`)}
                        >
                          Tagok
                        </Text>
                      ) : null}
                      <Text style={styles.listAction} onPress={() => setRenamingChoice(choice)}>
                        Átnevezés
                      </Text>
                      {choice.groupId ? (
                        <Text
                          style={[styles.listAction, styles.listActionDestructive]}
                          onPress={() => setLeavingChoice(choice)}
                        >
                          {ownerOf(choice) ? 'Törlés' : 'Kilépés'}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.divider} />
                  </View>
                );
              })
            ) : (
              <Text style={styles.guestText}>
                Egyetlen bevásárlólistád van. Ha megosztod, vagy csatlakozol valakiéhez, itt tudsz
                majd váltani köztük.
              </Text>
            )}

            {!isConnected ? (
              <Text style={styles.hint}>
                Nincs internetkapcsolat — a csatlakozáshoz kapcsolat kell.
              </Text>
            ) : null}
            <Pressable
              style={[styles.button, !isConnected && styles.buttonDisabled]}
              onPress={() => setEnteringCode(true)}
              disabled={!isConnected}
            >
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
              label="Azonnali értesítés"
              hint="Szólok a csoportos listák változásairól, de csak amikor nincs nyitva az app."
              value={settings.instantPushEnabled}
              onValueChange={(value) => updateSettings({ instantPushEnabled: value })}
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

      {/* Development builds only, and never compiled into what testers get:
          __DEV__ is false there, so this whole block drops out. */}
      {__DEV__ ? (
        <>
          <Text style={styles.sectionHeader}>Fejlesztői eszközök</Text>
          <View style={styles.card}>
            <Text style={styles.guestText}>
              Visszaállítja a telefont a friss telepítés állapotába: kijelentkezés, a Firestore
              helyi gyorsítótárának ürítése, a vendég adatbázis törlése, majd újratöltés. iOS-en
              ez az egyetlen út az app törlése nélkül.
            </Text>
            <Pressable
              style={[styles.button, styles.dangerButton]}
              onPress={() => setConfirmingReset(true)}
            >
              <Text style={styles.buttonLabel}>Helyi adatok visszaállítása</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <ConfirmDialog
        visible={confirmingReset}
        title="Helyi adatok visszaállítása"
        message="Kijelentkezel, és ezen a telefonon minden helyi adat törlődik — a vendéglista, a Firestore gyorsítótára és a „volt már itt fiók” jelölő is. A felhőben tárolt listáidat nem érinti. Az app ezután újratölt."
        confirmLabel="Visszaállítás"
        destructive
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          setConfirmingReset(false);
          resetDeviceState().catch((e: any) =>
            setListError(
              e?.message ?? 'A visszaállítás félbemaradt. Indítsd újra kézzel az appot.'
            )
          );
        }}
      />

      <ConfirmDialog
        visible={confirmingSignOut}
        title="Kijelentkezés"
        message="Biztosan kijelentkezel? A listáid és csoportjaid a fiókodban maradnak, de amíg vissza nem lépsz, nem éred el őket ezen a készüléken. Helyettük ennek a telefonnak a saját, különálló listája jelenik meg."
        confirmLabel="Kijelentkezés"
        destructive
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          signOutFully();
        }}
      />

      <PromptDialog
        visible={!!renamingChoice}
        title="Lista átnevezése"
        capitalize
        message="A többi tag is ezen a néven fogja látni."
        initialValue={renamingChoice?.name ?? ''}
        onCancel={() => setRenamingChoice(null)}
        onConfirm={async (name) => {
          if (renamingChoice) await applyRename(renamingChoice, name);
          setRenamingChoice(null);
        }}
      />

      <ConfirmDialog
        visible={!!leavingChoice}
        title={leavingChoice && ownerOf(leavingChoice) ? 'Lista törlése' : 'Kilépés a listából'}
        message={
          leavingChoice && ownerOf(leavingChoice)
            ? `A(z) "${leavingChoice?.name}" lista minden tagnál megszűnik. A saját listáid megmaradnak, csak újra privátak lesznek.`
            : `Kilépsz a(z) "${leavingChoice?.name}" listából. A tételeit ezután nem éred el, de új meghívóval bármikor visszatérhetsz.`
        }
        confirmLabel={leavingChoice && ownerOf(leavingChoice) ? 'Törlés' : 'Kilépés'}
        destructive
        onCancel={() => setLeavingChoice(null)}
        onConfirm={() => {
          const choice = leavingChoice;
          setLeavingChoice(null);
          if (choice) {
            applyLeave(choice).catch((e: any) =>
              setListError(e?.message ?? 'Nem sikerült végrehajtani.')
            );
          }
        }}
      />

      <ConfirmDialog
        visible={!!listError}
        title="Nem sikerült"
        message={listError ?? ''}
        confirmLabel="Értem"
        hideCancel
        onCancel={() => setListError(null)}
        onConfirm={() => setListError(null)}
      />

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
  hint: {
    color: '#D9534F',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  dangerButton: {
    backgroundColor: '#D9534F',
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
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  listTextColumn: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
  },
  listNameActive: {
    fontWeight: '700',
  },
  listHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  listActiveMark: {
    color: '#4A90D9',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  // The rarer operations, laid out as text rather than buttons: they belong to
  // the row above them, and three filled controls per list would drown it.
  listActions: {
    flexDirection: 'row',
    gap: 18,
    paddingBottom: 8,
  },
  listAction: {
    fontSize: 13,
    color: '#4A90D9',
    fontWeight: '600',
  },
  listActionDestructive: {
    color: '#D9534F',
  },
});
