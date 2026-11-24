import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatElapsed } from '../format';
import { colors, radius } from '../theme';

type Props = {
  /** ISO time the running session began, or null when not running. */
  startedAt: string | null;
  completedSets: number;
  totalSets: number;
  busy: boolean;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
};

/** How long "Cancel" stays armed waiting for the confirming second tap. */
const CANCEL_ARMED_MS = 3000;

/**
 * Start / Finish control for a workout. "Start workout" begins a timed session; while it
 * runs this shows the elapsed time and progress, a Finish button that logs the session to
 * history, and a two-tap Cancel that discards it.
 */
export default function SessionBar({ startedAt, completedSets, totalSets, busy, onStart, onFinish, onCancel }: Props) {
  if (!startedAt) {
    return (
      <Pressable
        onPress={onStart}
        disabled={busy}
        style={({ pressed }) => [styles.start, (pressed || busy) && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Start workout"
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.startText}>Start workout</Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.active}>
      <View style={styles.status}>
        <View style={styles.liveDot} />
        <Text style={styles.statusLabel}>In progress</Text>
        <Elapsed since={startedAt} />
        <Text style={styles.progress}>
          {completedSets}/{totalSets} sets
        </Text>
      </View>
      <View style={styles.actions}>
        <CancelButton onConfirm={onCancel} disabled={busy} />
        <Pressable
          onPress={onFinish}
          disabled={busy}
          style={({ pressed }) => [styles.finish, (pressed || busy) && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Finish workout and save it to history"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.finishText}>Finish</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/** Ticking timer since `since`. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Text style={styles.elapsed}>{formatElapsed(now - new Date(since).getTime())}</Text>;
}

function CancelButton({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CANCEL_ARMED_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Pressable
      onPress={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      disabled={disabled}
      style={({ pressed }) => [styles.cancel, armed && styles.cancelArmed, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={armed ? 'Tap again to discard this workout' : 'Cancel workout'}
    >
      <Text style={[styles.cancelText, armed && styles.cancelTextArmed]}>{armed ? 'Discard?' : 'Cancel'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  start: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  active: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
    padding: 12,
    gap: 12,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  liveDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.success },
  statusLabel: { color: colors.success, fontSize: 14, fontWeight: '700' },
  elapsed: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progress: { marginLeft: 'auto', color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  cancel: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelArmed: { backgroundColor: colors.danger, borderColor: colors.danger },
  cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  cancelTextArmed: { color: '#fff' },
  finish: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
