import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface PromptDialogProps {
  visible: boolean;
  title: string;
  /** Explains what to type, when the title alone doesn't. */
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Lets an empty submission through, for fields whose value is optional. */
  allowEmpty?: boolean;
  /** For addresses and the like, where autocapitalising the first letter is wrong. */
  email?: boolean;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
}

export function PromptDialog({
  visible,
  title,
  message,
  initialValue = '',
  placeholder,
  confirmLabel = 'Mentés',
  cancelLabel = 'Mégse',
  allowEmpty,
  email,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  /**
   * `autoFocus` is enough on iOS but not on Android inside a Modal: the input
   * takes focus while the modal's window is still being attached, so the
   * request to raise the keyboard lands nowhere. The field then sits there
   * focused but silent until tapped — which is exactly what it looked like.
   *
   * Focusing from `onShow` waits for the window to exist, and the small delay
   * covers the rest of the attach: focusing in the same tick still loses the
   * race often enough to matter.
   */
  const focusAfterShow = () => {
    if (Platform.OS !== 'android') return;
    // Android drops the IME request if it arrives while the modal's window is
    // still attaching, and there is no event for "attached" — onShow fires too
    // early in practice. A single delayed focus was still losing the race, so
    // ask a few times across the first half second; focusing an already
    // focused field costs nothing.
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      inputRef.current?.focus();
      if (attempts < 5) setTimeout(tryFocus, 120);
    };
    tryFocus();
  };

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed && !allowEmpty) return;
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
    } catch (e: any) {
      setError(e?.message ?? 'Nem sikerült menteni.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={focusAfterShow}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={(text) => {
              setValue(text);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            style={styles.input}
            autoFocus
            // Nothing typed into these dialogs — product names, list names,
            // quantities, addresses, invite codes — wants a capital first
            // letter forced on it.
            autoCapitalize="none"
            autoCorrect={!email}
            keyboardType={email ? 'email-address' : 'default'}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonLabel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={submit} disabled={submitting}>
              <Text style={[styles.buttonLabel, styles.buttonLabelPrimary]}>
                {submitting ? 'Mentés…' : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Anchored near the top rather than centred: this dialog always has the
  // keyboard up, and on Android a Modal is its own window — it neither resizes
  // nor reports insets to the app, so a centred card sits behind the keyboard
  // with no way to lift it. Up here the keyboard cannot reach it.
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 24,
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
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  error: {
    color: '#D9534F',
    fontSize: 13,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 16,
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
});
