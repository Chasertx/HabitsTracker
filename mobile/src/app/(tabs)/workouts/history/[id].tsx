import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, type SessionDetail } from '../../../../api';
import { ErrorBanner } from '../../../../components/Feedback';
import { formatDateTime, formatDuration, formatVolume, formatWeight } from '../../../../format';
import { colors, radius } from '../../../../theme';

/** One finished session: when, how long, and every set with whether it was done. */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api.history.get(Number(id)).then(
        (data) => {
          setSession(data);
          setError(null);
        },
        () => setError("Couldn't load this session."),
      ),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!session) {
    return (
      <View style={styles.root}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <View style={styles.body}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
          {!error && <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />}
        </View>
      </View>
    );
  }

  const sets = session.exercises.flatMap((x) => x.sets);
  const done = sets.filter((s) => s.isCompleted);
  const volume = done.reduce((sum, s) => sum + s.reps * s.weight, 0);
  const duration = formatDuration(session.durationSeconds * 1000);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: session.workoutName }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.when}>Started {formatDateTime(session.startedAt)}</Text>
        <Text style={styles.when}>Finished {formatDateTime(session.finishedAt)}</Text>
        <View style={styles.stats}>
          <Stat label="Duration" value={duration} />
          <Stat label="Sets done" value={`${done.length}/${sets.length}`} />
          <Stat label="Volume" value={formatVolume(volume)} />
        </View>

        {session.exercises.map((x) => {
          const exerciseDone = x.sets.length > 0 && x.sets.every((s) => s.isCompleted);
          return (
            <View key={x.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name={exerciseDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={exerciseDone ? colors.success : colors.textFaint}
                />
                <Text style={styles.exerciseName}>{x.name}</Text>
              </View>
              {x.sets.length === 0 ? (
                <Text style={styles.noSets}>No sets</Text>
              ) : (
                x.sets.map((s, i) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={styles.setNumber}>Set {i + 1}</Text>
                    <Text style={[styles.setValue, !s.isCompleted && styles.skipped]}>
                      {s.reps} reps × {formatWeight(s.weight)}
                    </Text>
                    <Ionicons
                      name={s.isCompleted ? 'checkmark' : 'remove'}
                      size={18}
                      color={s.isCompleted ? colors.success : colors.textFaint}
                      accessibilityLabel={s.isCompleted ? 'Done' : 'Skipped'}
                    />
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  when: { color: colors.textMuted, fontSize: 14, fontWeight: '500', marginLeft: 6 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  noSets: { color: colors.textFaint, fontSize: 14, marginLeft: 28 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 28 },
  setNumber: { width: 56, color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  setValue: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  skipped: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
