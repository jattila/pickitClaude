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
  /**
   * A second way forward next to the confirm action, for the cases where the
   * dialog is offering a choice rather than asking a yes/no — "sign in" beside
   * "register", say. Both read as primary, because neither is the safe default.
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /**
   * Draws the actions as filled pills, the same shape as the header buttons.
   * For dialogs that offer a way forward rather than ask for a confirmation —
   * there the actions are the point, and flat text reads as an afterthought.
   * Cancel stays plain text either way, so it doesn't compete with them.
   */
  filledActions?: boolean;
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
  secondaryLabel,
  onSecondary,
  filledActions,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // With filled actions the way out moves to a close icon in the corner: a
  // third pill would read as a third option, and backing out is not one of the
  // choices being offered — it is leaving them alone.
  const showClose = !!filledActions && !hideCancel;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {showClose ? (
            <Pressable
              style={styles.closeButton}
              onPress={onCancel}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Bezárás"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.title, showClose && styles.titleWithClose]}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={[styles.buttonRow, filledActions && styles.buttonRowFilled]}>
            {hideCancel || showClose ? null : (
              <Pressable style={styles.button} onPress={onCancel}>
                <Text style={styles.buttonLabel}>{cancelLabel}</Text>
              </Pressable>
            )}
            {secondaryLabel && onSecondary ? (
              <Pressable
                style={[styles.button, filledActions && styles.buttonFilled]}
                onPress={onSecondary}
              >
                <Text
                  style={[
                    styles.buttonLabel,
                    filledActions ? styles.buttonLabelFilled : styles.buttonLabelPrimary,
                  ]}
                >
                  {secondaryLabel}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[
                styles.button,
                filledActions && styles.buttonFilled,
                filledActions && destructive && styles.buttonFilledDestructive,
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.buttonLabel,
                  filledActions ? styles.buttonLabelFilled : styles.buttonLabelPrimary,
                  !filledActions && destructive && styles.buttonLabelDestructive,
                ]}
              >
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
  // Keeps a long title from running underneath the close icon, which is
  // positioned over the card rather than laid out beside the text.
  titleWithClose: {
    paddingRight: 28,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    padding: 6,
    zIndex: 1,
  },
  closeIcon: {
    fontSize: 17,
    lineHeight: 20,
    color: '#999',
  },
  message: {
    fontSize: 14,
    color: '#444',
    marginBottom: 16,
  },
  // Wraps because three buttons ("Mégse / Belépés / Regisztráció") are wider
  // than a narrow phone's dialog card, and a silently clipped action is worse
  // than one that moves to a second line.
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 20,
  },
  // Pills sit closer together than text links do — the gap that separates two
  // labels is too much between two solid blocks.
  buttonRowFilled: {
    gap: 10,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  // Matches the header buttons exactly: same colour, radius and padding, so a
  // dialog action and "Belépés" up top are recognisably the same control.
  buttonFilled: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  buttonFilledDestructive: {
    backgroundColor: '#D9534F',
  },
  buttonLabelFilled: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
