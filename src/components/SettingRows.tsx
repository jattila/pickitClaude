import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface ToggleRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ToggleRow({ label, hint, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextColumn}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export interface ChoiceOption {
  value: number;
  label: string;
}

interface ChoiceRowProps {
  label: string;
  hint?: string;
  options: ChoiceOption[];
  value: number;
  onSelect: (value: number) => void;
  disabled?: boolean;
}

/** Segmented picker — the option sets here are short and fixed, so a full modal picker would be overkill. */
export function ChoiceRow({ label, hint, options, value, onSelect, disabled }: ChoiceRowProps) {
  return (
    <View style={[styles.choiceRow, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.segments}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => !disabled && onSelect(option.value)}
            >
              <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextColumn: {
    flex: 1,
  },
  choiceRow: {
    gap: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  hint: {
    fontSize: 13,
    color: '#888',
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: '#EAF2FB',
    borderColor: '#4A90D9',
  },
  segmentLabel: {
    fontSize: 13,
    color: '#555',
  },
  segmentLabelSelected: {
    color: '#2D6FB0',
    fontWeight: '700',
  },
});
