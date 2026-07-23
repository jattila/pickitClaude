import { useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

export interface RowAction {
  key: string;
  label: string;
  icon: string; // short glyph/emoji shown on the swipe button and in the action sheet
  onPress: () => void;
  destructive?: boolean;
}

interface SwipeableActionRowProps {
  children: ReactNode;
  actions: RowAction[];
}

/**
 * Wraps a row with swipe-to-reveal icon actions AND a long-press action sheet
 * exposing the exact same `actions` — the two interaction paths can never drift
 * apart because they both render from this one list.
 */
export function SwipeableActionRow({ children, actions }: SwipeableActionRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const runAction = (action: RowAction) => {
    swipeableRef.current?.close();
    setSheetVisible(false);
    action.onPress();
  };

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        renderRightActions={() => (
          <View style={styles.rightActions}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => runAction(action)}
                style={[styles.swipeButton, action.destructive && styles.swipeButtonDestructive]}
              >
                <Text style={styles.swipeIcon}>{action.icon}</Text>
                <Text style={styles.swipeLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      >
        <Pressable onLongPress={() => setSheetVisible(true)} delayLongPress={350}>
          {children}
        </Pressable>
      </ReanimatedSwipeable>

      <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={() => setSheetVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetVisible(false)}>
          <View style={styles.sheet}>
            {actions.map((action) => (
              <Pressable key={action.key} style={styles.sheetRow} onPress={() => runAction(action)}>
                <Text style={styles.sheetIcon}>{action.icon}</Text>
                <Text style={[styles.sheetLabel, action.destructive && styles.sheetLabelDestructive]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rightActions: {
    flexDirection: 'row',
    height: '100%',
  },
  swipeButton: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
  },
  swipeButtonDestructive: {
    backgroundColor: '#D9534F',
  },
  swipeIcon: {
    fontSize: 20,
  },
  swipeLabel: {
    color: 'white',
    fontSize: 11,
    marginTop: 2,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  sheetIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  sheetLabel: {
    fontSize: 16,
  },
  sheetLabelDestructive: {
    color: '#D9534F',
  },
});
