import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

export interface RowAction {
  key: string;
  label: string;
  icon: string; // short glyph/emoji shown on the swipe button
  onPress: () => void;
  destructive?: boolean;
}

interface SwipeableActionRowProps {
  children: ReactNode;
  actions: RowAction[];
  /** Tap handler for the row itself — passed here (not as a nested Pressable)
   * so a single Pressable can own both onPress and onLongPress; nesting two
   * Pressables lets the inner one swallow the touch before onLongPress fires. */
  onPress?: () => void;
}

/**
 * Wraps a row with swipe-to-reveal icon actions. A long-press opens the very
 * same action panel programmatically, so both interaction paths surface the
 * actions in the exact same place (no separate bottom sheet).
 */
export function SwipeableActionRow({ children, actions, onPress }: SwipeableActionRowProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const runAction = (action: RowAction) => {
    swipeableRef.current?.close();
    action.onPress();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
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
      <Pressable onPress={onPress} onLongPress={() => swipeableRef.current?.openRight()} delayLongPress={350}>
        {children}
      </Pressable>
    </ReanimatedSwipeable>
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
});
