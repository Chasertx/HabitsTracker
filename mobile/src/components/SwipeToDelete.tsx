import { type ReactNode, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, radius } from '../theme';

type Props = {
  children: ReactNode;
  onDelete: () => void;
  /** What is being deleted, for screen readers (e.g. "Delete Push Day"). */
  label: string;
  /** Spacing around the row (e.g. marginBottom), applied outside the swipe area. */
  style?: StyleProp<ViewStyle>;
};

const ACTION_WIDTH = 88;

/**
 * Swipe a row left to reveal a red Delete button; tapping that button deletes.
 * Tapping the row or swiping back closes it again.
 */
export default function SwipeToDelete({ children, onDelete, label, style }: Props) {
  const swipe = useRef<SwipeableMethods>(null);

  return (
    <View style={[styles.wrap, style]}>
      <ReanimatedSwipeable
        ref={swipe}
        friction={1.5}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        containerStyle={styles.container}
        renderRightActions={() => (
          <Pressable
            onPress={() => {
              swipe.current?.close();
              onDelete();
            }}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </Pressable>
        )}
      >
        {/* Opaque backing so translucent rows don't show the red action through them. */}
        <View style={styles.backing}>{children}</View>
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden' },
  container: { backgroundColor: colors.danger, borderRadius: radius.md },
  backing: { backgroundColor: colors.background, borderRadius: radius.md },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: { opacity: 0.75 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
