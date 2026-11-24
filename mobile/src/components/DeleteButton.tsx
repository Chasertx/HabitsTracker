import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  onConfirm: () => void;
  /** What is being deleted, for screen readers (e.g. "Delete Push Day"). */
  label: string;
};

/** How long the button stays red waiting for the second tap. */
const ARMED_MS = 3000;

/**
 * An × button that deletes on the second tap: the first tap turns it red, and it
 * resets on its own if the second tap doesn't come.
 */
export default function DeleteButton({ onConfirm, label }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const press = () => {
    if (armed) {
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
    }
  };

  return (
    <Pressable
      onPress={press}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        armed && styles.armed,
        pressed && !armed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={armed ? `${label}: tap again to confirm` : label}
    >
      <Text style={[styles.icon, armed && styles.iconArmed]}>×</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.dangerSoft },
  armed: { backgroundColor: colors.danger },
  icon: { color: colors.textMuted, fontSize: 24, lineHeight: 26, fontWeight: '300' },
  iconArmed: { color: '#fff', fontWeight: '500' },
});
