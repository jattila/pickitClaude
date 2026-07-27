import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** For dialogs that only report something: there is nothing to cancel. */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Mégse',
  destructive,
  hideCancel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttonRow}>
            {hideCancel ? null : (
              <Pressable style={styles.button} onPress={onCancel}>
                <Text style={styles.buttonLabel}>{cancelLabel}</Text>
              </Pressable>
            )}
            <Pressable style={styles.button} onPress={onConfirm}>
              <Text style={[styles.buttonLabel, styles.buttonLabelPrimary, destructive && styles.buttonLabelDestructive]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#444',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  buttonLabel: {
    fontSize: 15,
    color: '#666',
  },
  buttonLabelPrimary: {
    color: '#4A90D9',
    fontWeight: '600',
  },
  buttonLabelDestructive: {
    color: '#D9534F',
  },
});
