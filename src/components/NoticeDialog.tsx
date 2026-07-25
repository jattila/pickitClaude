import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotices } from '../hooks/useNotices';

/**
 * Shows server-left notices one at a time, mounted once in the root layout so
 * one appears as soon as the app opens. Dismissing deletes it, so each is seen
 * exactly once.
 */
export function NoticeDialog() {
  const { notices, dismiss } = useNotices();
  const notice = notices[0];
  if (!notice) return null;

  const suspended = notice.type === 'group-suspended';
  const title = suspended ? 'Felfüggesztett hozzáférés' : 'Újra hozzáférsz a csoporthoz';
  const message = suspended
    ? `A(z) "${notice.groupName}" csoporthoz való hozzáférésedet felfüggesztették, ezért a csoport listái és tételei egyelőre nem érhetők el.`
    : `A(z) "${notice.groupName}" csoporthoz való hozzáférésedet visszaállították, a listák és tételek ismét elérhetők.`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismiss(notice.id)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {suspended ? (
            notice.ownerEmail ? (
              <>
                <Text style={styles.contactLabel}>
                  Ha tévedésnek gondolod, vagy szeretnéd kérni a feloldását, itt jelezheted:
                </Text>
                <Pressable onPress={() => Linking.openURL(`mailto:${notice.ownerEmail}`)}>
                  <Text style={styles.contactEmail}>{notice.ownerEmail}</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.contactLabel}>
                A feloldásához keresd a csoport tulajdonosát
                {notice.ownerName ? ` (${notice.ownerName})` : ''}.
              </Text>
            )
          ) : null}

          <Pressable style={styles.button} onPress={() => dismiss(notice.id)}>
            <Text style={styles.buttonLabel}>Rendben</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  message: {
    fontSize: 15,
    color: '#444',
    lineHeight: 21,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90D9',
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
  },
});
