import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatElapsed } from '../format';
import { colors, radius } from '../theme';

export type SessionClock = {
  /** ISO time the running session began, or null when not running. */
  startedAt: string | null;
  /** ISO time the session was paused, or null while the clock runs. */
  pausedAt: string | null;
  /** Seconds spent paused so far, not counting a pause in progress. */
  pausedSeconds: number;
};

/** Active (unpaused) milliseconds of a session at time `now`. */
export function sessionElapsedMs({ startedAt, pausedAt, pausedSeconds }: SessionClock, now: number) {
  if (!startedAt) return 0;
  const end = pausedAt ? new Date(pausedAt).getTime() : now;
  return end - new Date(startedAt).getTime() - pausedSeconds * 1000;
}

/** Large workout timer: ticks while running, holds while paused, 0:00 when idle. */
export function WorkoutTimer({ clock }: { clock: SessionClock }) {
  const running = clock.startedAt !== null && clock.pausedAt === null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running, clock.startedAt, clock.pausedAt]);

  const state = !clock.startedAt ? 'Ready' : clock.pausedAt ? 'Paused' : 'In progress';
  return (
    <View style={styles.timer} accessibilityRole="timer">
      <Text style={[styles.timerState, running && styles.timerStateLive, clock.pausedAt && styles.timerStatePaused]}>
        {state}
      </Text>
      <Text style={[styles.timerValue, !running && styles.timerValueIdle]}>
        {formatElapsed(sessionElapsedMs(clock, now))}
      </Text>
    </View>
  );
}

type Props = {
  clock: SessionClock;
  completedSets: number;
  totalSets: number;
  busy: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
};

/** How long "Cancel" stays armed waiting for the confirming second tap. */
const CANCEL_ARMED_MS = 3000;

/**
 * Controls for a workout session:
 *   idle     → Start (disabled until the workout has at least one set)
 *   running  → Pause · Finish
 *   paused   → Cancel (two taps) · Resume
 * Finish logs the session to history; Cancel throws it away.
 */
export default function SessionBar({
  clock,
  completedSets,
  totalSets,
  busy,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
}: Props) {
  if (!clock.startedAt) {
    const empty = totalSets === 0;
    return (
      <View style={styles.idle}>
        <Pressable
          onPress={onStart}
          disabled={busy || empty}
          style={({ pressed }) => [styles.start, empty && styles.disabled, (pressed || busy) && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Start workout"
          accessibilityState={{ disabled: busy || empty }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={18} color={empty ? colors.textFaint : '#fff'} />
              <Text style={[styles.startText, empty && styles.disabledText]}>Start workout</Text>
            </>
          )}
        </Pressable>
        {empty && <Text style={styles.hint}>Add an exercise with at least one set to start.</Text>}
      </View>
    );
  }

  const paused = clock.pausedAt !== null;
  return (
    <View style={[styles.active, paused && styles.activePaused]}>
      <Text style={styles.progress}>
        {completedSets}/{totalSets} sets done
        {completedSets < totalSets ? ' · finishes when every set is checked' : ''}
      </Text>
      <View style={styles.actions}>
        {paused ? (
          <CancelButton onConfirm={onCancel} disabled={busy} />
        ) : (
          <Pressable
            onPress={onPause}
            disabled={busy}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Pause workout"
          >
            <Ionicons name="pause" size={18} color={colors.text} />
            <Text style={styles.secondaryText}>Pause</Text>
          </Pressable>
        )}
        <Pressable
          onPress={paused ? onResume : onFinish}
          disabled={busy}
          style={({ pressed }) => [styles.primary, paused && styles.resume, (pressed || busy) && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Resume workout' : 'Finish workout and save it to history'}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={paused ? 'play' : 'checkmark-done'} size={20} color="#fff" />
              <Text style={styles.primaryText}>{paused ? 'Resume' : 'Finish'}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
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
      style={({ pressed }) => [styles.secondary, armed && styles.cancelArmed, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={armed ? 'Tap again to discard this workout' : 'Cancel workout'}
    >
      <Ionicons name="close" size={18} color={armed ? '#fff' : colors.danger} />
      <Text style={[styles.secondaryText, styles.cancelText, armed && styles.cancelTextArmed]}>
        {armed ? 'Discard?' : 'Cancel'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  timer: { alignItems: 'center', paddingVertical: 8 },
  timerState: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timerStateLive: { color: colors.success },
  timerStatePaused: { color: colors.accent },
  timerValue: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  timerValueIdle: { color: colors.textMuted },
  idle: { gap: 8 },
  start: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { backgroundColor: colors.surfaceRaised },
  startText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledText: { color: colors.textFaint },
  hint: { color: colors.textFaint, fontSize: 13, textAlign: 'center' },
  active: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
    padding: 12,
    gap: 12,
  },
  activePaused: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  progress: { color: colors.textMuted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  secondary: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cancelArmed: { backgroundColor: colors.danger, borderColor: colors.danger },
  cancelText: { color: colors.danger },
  cancelTextArmed: { color: '#fff' },
  primary: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resume: { backgroundColor: colors.accent },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
