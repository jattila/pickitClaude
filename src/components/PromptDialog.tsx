import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
  /**
   * Capitalises the first letter, for fields whose value is a name rather than
   * a word: lists get called "Kovács Család", not "kovács család". Off by
   * default — product names, quantities and invite codes all read worse with a
   * capital forced on them.
   */
  capitalize?: boolean;
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
  capitalize,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  // A Modal handled the hardware back button for us via onRequestClose; an
  // in-app overlay has to do it itself, or back would leave the screen with
  // the dialog still open on top of wherever it landed.
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onCancel]);

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

  /**
   * Rendered inside the app's own view tree rather than in a Modal.
   *
   * On Android a Modal is a separate window, and that is what made the
   * keyboard unreachable here: the input took focus before the window had
   * finished attaching, so the request to raise the keyboard was dropped, and
   * the window neither resized for the keyboard nor reported its insets to the
   * app. Focusing on onShow, then retrying five times across half a second,
   * still did not raise it reliably.
   *
   * In the app's own window all of that is ordinary again: mounting the field
   * with autoFocus raises the keyboard, and the activity resizes around it.
   * The cost is that the backdrop covers the screen but not the navigation
   * header — acceptable, and the card sits near the top anyway.
   */
  if (!visible) return null;

  return (
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            value={value}
            onChangeText={(text) => {
              setValue(text);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            style={styles.input}
            autoFocus
            // Off unless asked for. Product names, quantities, addresses and
            // invite codes all read worse with a capital forced on them; a list
            // name is the exception, because it is a name. `sentences` rather
            // than `words`: "Szülinapi buli" is right, "Szülinapi Buli" is not.
            autoCapitalize={capitalize && !email ? 'sentences' : 'none'}
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
  );
}

const styles = StyleSheet.create({
  // Anchored near the top rather than centred: this dialog always has the
  // keyboard up, and on Android a Modal is its own window — it neither resizes
  // nor reports insets to the app, so a centred card sits behind the keyboard
  // with no way to lift it. Up here the keyboard cannot reach it.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // Above the screen's own content, including anything with elevation.
    zIndex: 100,
    elevation: 100,
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
