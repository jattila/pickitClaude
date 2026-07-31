import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface PromptDialogProps {
  visible: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Lets an empty submission through, for fields whose value is optional. */
  allowEmpty?: boolean;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
}

export function PromptDialog({
  visible,
  title,
  initialValue = '',
  placeholder,
  confirmLabel = 'Mentés',
  cancelLabel = 'Mégse',
  allowEmpty,
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
    setTimeout(() => inputRef.current?.focus(), 50);
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
