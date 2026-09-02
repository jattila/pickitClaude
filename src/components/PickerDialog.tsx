import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface PickerOption {
  key: string;
  label: string;
  /** Secondary line — member counts, and the like. */
  hint?: string;
}

interface PickerDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  options: PickerOption[];
  onSelect: (key: string) => void;
  onCancel: () => void;
}

/**
 * A short list to choose from — used when sharing an occasional list, to pick
 * between making a new circle and handing it to one that already exists.
 *
 * A dialog rather than a screen because the choice is part of one action and
 * has no state of its own; pushing a route for it would put a back button in
 * the middle of a sentence.
 */
export function PickerDialog({
  visible,
  title,
  message,
  options,
  onSelect,
  onCancel,
}: PickerDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Scrolls because the number of circles is the user's business, not
              ours — a family with six of them should still reach the last one. */}
          <ScrollView style={styles.options} bounces={false}>
            {options.map((option) => (
              <Pressable key={option.key} style={styles.option} onPress={() => onSelect(option.key)}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.hint ? <Text style={styles.optionHint}>{option.hint}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonLabel}>Mégse</Text>
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
    color: '#666',
    marginBottom: 8,
  },
  options: {
    maxHeight: 280,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  optionLabel: {
    fontSize: 15,
    color: '#3A6690',
    fontWeight: '500',
  },
  optionHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  buttonLabel: {
    fontSize: 15,
    color: '#666',
  },
});
