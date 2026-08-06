import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGroupMembers } from '../../../../../src/hooks/useGroupMembers';
import { useGroups } from '../../../../../src/hooks/useGroups';
import {
  backfillMemberEmails,
  createInvite,
  revokeInvite,
  setMemberSuspended,
  type PendingInvite,
} from '../../../../../src/services/groups';
import { useNetworkStatus } from '../../../../../src/hooks/useNetworkStatus';
import { useAuthStore } from '../../../../../src/store/authStore';
import { ConfirmDialog } from '../../../../../src/components/ConfirmDialog';
import { PromptDialog } from '../../../../../src/components/PromptDialog';
import { useGroupInvites } from '../../../../../src/hooks/useGroupInvites';
import type { GroupMember } from '../../../../../src/data/types';

export default function GroupMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { isConnected } = useNetworkStatus();
  const { members, loading } = useGroupMembers(groupId);
  const { groups } = useGroups();
  const currentUid = useAuthStore((state) => state.user?.uid);
  const [revealedUid, setRevealedUid] = useState<string | null>(null);
  const group = groups.find((g) => g.id === groupId);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSuspend, setPendingSuspend] = useState<GroupMember | null>(null);
  const [working, setWorking] = useState(false);
  const [enteringEmail, setEnteringEmail] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<PendingInvite | null>(null);
  const { invites, refresh: refreshInvites } = useGroupInvites(groupId);

  const applyRevoke = async (invite: PendingInvite) => {
    setError(null);
    setWorking(true);
    try {
      await revokeInvite(invite.code);
      await refreshInvites();
    } catch (e: any) {
      setError(e?.message ?? 'Nem sikerült visszavonni a meghívót.');
    } finally {
      setWorking(false);
    }
  };

  const isOwner = !!currentUid && group?.ownerId === currentUid;

  // Members who joined before member docs carried an email have none stored.
  // The owner opening this screen is the natural moment to repair that, so it
  // happens silently here instead of behind a one-off maintenance button.
  // The ref keeps it to a single attempt per visit — members whose account
  // genuinely has no email stay null, and would otherwise retrigger forever.
  const backfillAttempted = useRef(false);
  useEffect(() => {
    if (backfillAttempted.current) return;
    if (!isOwner || !isConnected || members.length === 0) return;
    if (!members.some((member) => !member.email)) return;
    backfillAttempted.current = true;
    backfillMemberEmails(groupId).catch(() => undefined);
  }, [isOwner, isConnected, members, groupId]);

  const applySuspension = async (member: GroupMember) => {
    setError(null);
    setWorking(true);
    try {
      await setMemberSuspended(groupId, member.uid, !member.suspended);
    } catch (e: any) {
      setError(e?.message ?? 'Nem sikerült módosítani a tag állapotát.');
    } finally {
      setWorking(false);
    }
  };

  const handleInvite = async (email: string) => {
    setError(null);
    setCreatingInvite(true);
    try {
      const code = await createInvite(groupId, email);
      // Refresh before sharing: the share sheet suspends this screen, and the
      // invitee should already be in the list when it comes back.
      await refreshInvites();
      const groupName = group?.name ?? 'a csoportomhoz';
      await Share.share({
        message: `Csatlakozz a(z) "${groupName}" csoporthoz a PickIt appban!\n\npickit://join/${code}\n\nVagy add meg ezt a kódot: ${code}`,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Nem sikerült meghívót létrehozni.');
    } finally {
      setCreatingInvite(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Tagok' }} />

      {!loading && members.length === 0 && invites.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Még nincsenek tagok.</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => {
            const revealed = revealedUid === item.uid;
            return (
              <Pressable
                style={styles.memberRow}
                onLongPress={() => setRevealedUid(revealed ? null : item.uid)}
                delayLongPress={350}
              >
                <View style={styles.memberTextColumn}>
                  <Text style={[styles.memberName, item.suspended && styles.memberNameSuspended]}>
                    {item.displayName || 'Névtelen'}
                    {item.uid === currentUid ? <Text style={styles.selfTag}> (én)</Text> : null}
                  </Text>
                  {revealed ? (
                    <Text style={styles.memberEmail}>
                      {item.email ?? 'Nincs elmentve e-mail cím ehhez a taghoz.'}
                    </Text>
                  ) : null}
                </View>

                <Text style={[styles.memberRole, item.suspended && styles.memberRoleSuspended]}>
                  {item.suspended ? 'felfüggesztve' : item.role === 'owner' ? 'tulajdonos' : 'tag'}
                </Text>

                {/* The owner can't suspend themselves — that would lock the group's only admin out. */}
                {isOwner && item.uid !== currentUid ? (
                  <Pressable
                    onPress={() => setPendingSuspend(item)}
                    hitSlop={10}
                    disabled={working || !isConnected}
                    style={styles.suspendButton}
                  >
                    <Ionicons
                      name={item.suspended ? 'person-add-outline' : 'person-remove-outline'}
                      size={20}
                      color={item.suspended ? '#4A90D9' : '#D9534F'}
                    />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          }}
          /* Outstanding invites sit under the real members, muted: they are
             people the group is waiting on, not people who can see anything
             yet. Rendered as a footer so they share the list's scrolling. */
          ListFooterComponent={
            invites.length === 0 ? null : (
              <View>
                {invites.map((invite) => (
                  <Pressable
                    key={invite.code}
                    style={styles.memberRow}
                    // Long-press to withdraw, matching how the rest of this app
                    // hides destructive actions behind a deliberate gesture.
                    // Open to whoever sent it as well as the owner: any member
                    // can invite, so any member can mistype an address.
                    onLongPress={
                      isOwner || (!!currentUid && invite.createdBy === currentUid)
                        ? () => setPendingRevoke(invite)
                        : undefined
                    }
                    delayLongPress={350}
                  >
                    <View style={styles.memberTextColumn}>
                      <Text style={styles.pendingEmail}>{invite.email}</Text>
                    </View>
                    <Text style={styles.pendingStatus}>
                      {invite.status === 'awaiting-verification'
                        ? 'visszaigazolásra vár'
                        : 'meghívva'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )
          }
        />
      )}

      {!isConnected ? (
        <Text style={styles.error}>Nincs internetkapcsolat — a meghívó készítéséhez kapcsolat kell.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.inviteButton}
        onPress={() => setEnteringEmail(true)}
        disabled={creatingInvite || !isConnected}
      >
        <Text style={styles.inviteButtonLabel}>
          {creatingInvite ? 'Meghívó készítése…' : '+ Tag meghívása'}
        </Text>
      </Pressable>

      <ConfirmDialog
        visible={!!pendingRevoke}
        title="Meghívó visszavonása"
        message={`A(z) "${pendingRevoke?.email}" címre szóló meghívó érvénytelenné válik. Ha már elküldted a kódot, az többé nem lesz beváltható.`}
        confirmLabel="Visszavonás"
        destructive
        onCancel={() => setPendingRevoke(null)}
        onConfirm={() => {
          if (pendingRevoke) applyRevoke(pendingRevoke);
          setPendingRevoke(null);
        }}
      />

      <PromptDialog
        visible={enteringEmail}
        title="Tag meghívása"
        message="Add meg a meghívott e-mail címét — ezzel jelenik meg a tagok listájában, amíg nem csatlakozik."
        placeholder="pl. anna@pelda.hu"
        email
        confirmLabel="Meghívó"
        onCancel={() => setEnteringEmail(false)}
        onConfirm={(email) => {
          setEnteringEmail(false);
          handleInvite(email);
        }}
      />

      <ConfirmDialog
        visible={!!pendingSuspend}
        title={pendingSuspend?.suspended ? 'Tag visszaengedélyezése' : 'Tag felfüggesztése'}
        message={
          pendingSuspend?.suspended
            ? `"${pendingSuspend?.displayName || 'A tag'}" újra hozzáfér a csoport listáihoz, és az app következő megnyitásakor értesül róla.`
            : `"${pendingSuspend?.displayName || 'A tag'}" nem fogja látni a csoport listáit és tételeit, amíg vissza nem engedélyezed. Az app következő megnyitásakor értesül róla, és megkapja a te e-mail címedet is, hogy jelezni tudjon.`
        }
        confirmLabel={pendingSuspend?.suspended ? 'Visszaengedélyezés' : 'Felfüggesztés'}
        destructive={!pendingSuspend?.suspended}
        onCancel={() => setPendingSuspend(null)}
        onConfirm={() => {
          if (pendingSuspend) applySuspension(pendingSuspend);
          setPendingSuspend(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#888',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  memberTextColumn: {
    flex: 1,
  },
  pendingEmail: {
    fontSize: 15,
    color: '#999',
  },
  pendingStatus: {
    fontSize: 13,
    color: '#B08A3D',
  },
  memberName: {
    fontSize: 16,
  },
  memberNameSuspended: {
    color: '#D9534F',
    textDecorationLine: 'line-through',
  },
  memberRoleSuspended: {
    color: '#D9534F',
    fontWeight: '700',
  },
  suspendButton: {
    marginLeft: 12,
  },
  selfTag: {
    color: '#888',
    fontSize: 14,
  },
  memberEmail: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
  },
  error: {
    color: '#D9534F',
    fontSize: 13,
    textAlign: 'center',
    padding: 12,
  },
  inviteButton: {
    margin: 16,
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inviteButtonLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
});
