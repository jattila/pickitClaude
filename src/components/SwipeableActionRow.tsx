import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface RowAction {
  key: string;
  label: string;
  icon: string; // short glyph/emoji shown on the action button
  onPress: () => void;
  destructive?: boolean;
}

interface SwipeableActionRowProps {
  children: ReactNode;
  actions: RowAction[];
  onPress?: () => void;
  /**
   * Rendered pinned to the right edge, *outside* the gesture detector, so its
   * own touches don't have to compete with the row's tap/long-press gestures.
   * The action panel slides in over it.
   */
  trailingOverlay?: ReactNode;
}

const BUTTON_WIDTH = 72;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Reveals action buttons on swipe or long-press WITHOUT moving the row content:
 * the row stays put and the buttons slide in from the right, overlaying the
 * right edge. Both interaction paths draw from the same `actions` list.
 */
export function SwipeableActionRow({
  children,
  actions,
  onPress,
  trailingOverlay,
}: SwipeableActionRowProps) {
  const panelWidth = actions.length * BUTTON_WIDTH;
  const open = useSharedValue(0); // 0 = closed, panelWidth = fully revealed
  const start = useSharedValue(0);

  const close = () => {
    open.value = withTiming(0, { duration: 150 });
  };

  const runAction = (action: RowAction) => {
    close();
    action.onPress();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      start.value = open.value;
    })
    .onUpdate((e) => {
      open.value = clamp(start.value - e.translationX, 0, panelWidth);
    })
    .onEnd((e) => {
      const shouldOpen = open.value > panelWidth / 2 || e.velocityX < -400;
      open.value = withTiming(shouldOpen ? panelWidth : 0, { duration: 150 });
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (open.value > 0) {
      open.value = withTiming(0, { duration: 150 });
    } else if (onPress) {
      runOnJS(onPress)();
    }
  });

  const longPress = Gesture.LongPress()
    .minDuration(350)
    .onStart(() => {
      open.value = withTiming(panelWidth, { duration: 150 });
    });

  const gesture = Gesture.Race(pan, longPress, tap);

  const actionsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelWidth - open.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <View>{children}</View>
      </GestureDetector>

      {trailingOverlay ? <View style={styles.trailingOverlay}>{trailingOverlay}</View> : null}

      <Animated.View style={[styles.actions, { width: panelWidth }, actionsStyle]}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => runAction(action)}
            style={[styles.button, action.destructive && styles.buttonDestructive]}
          >
            <Text style={styles.icon}>{action.icon}</Text>
            <Text style={styles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  trailingOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  button: {
    width: BUTTON_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
  },
  buttonDestructive: {
    backgroundColor: '#D9534F',
  },
  icon: {
    fontSize: 20,
  },
  label: {
    color: 'white',
    fontSize: 11,
    marginTop: 2,
  },
});
