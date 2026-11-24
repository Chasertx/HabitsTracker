import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, type Exercise, type WorkoutDetail } from '../../../api';
import Composer from '../../../components/Composer';
import { EmptyState, ErrorBanner } from '../../../components/Feedback';
import SessionBar from '../../../components/SessionBar';
import SimpleRow from '../../../components/SimpleRow';
import { formatDuration } from '../../../format';
import { colors, radius } from '../../../theme';

const isExerciseDone = (x: Exercise) => x.setCount > 0 && x.completedSetCount === x.setCount;

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const workoutId = Number(params.id);
  const [name, setName] = useState(params.name ?? '');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ sessionId: number; duration: string } | null>(null);

  const apply = useCallback((workout: WorkoutDetail) => {
    setName(workout.name);
    setExercises(workout.exercises);
    setStartedAt(workout.activeSessionStartedAt);
  }, []);

  const load = useCallback(
    () =>
      api.workouts.get(workoutId).then(
        (workout) => {
          apply(workout);
          setError(null);
        },
        () => setError("Couldn't load this workout. Pull down to retry."),
      ),
    [workoutId, apply],
  );

  // Reload whenever this screen is shown so set progress reflects changes made in an exercise.
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const add = useCallback(
    async (exerciseName: string) => {
      try {
        const created = await api.workouts.addExercise(workoutId, exerciseName);
        setExercises((prev) => [...prev, created]);
        setError(null);
      } catch (e) {
        setError("Couldn't add exercise.");
        throw e;
      }
    },
    [workoutId],
  );

  const remove = useCallback(
    async (exercise: Exercise) => {
      setExercises((prev) => prev.filter((x) => x.id !== exercise.id));
      try {
        await api.workouts.removeExercise(workoutId, exercise.id);
      } catch {
        setError("Couldn't remove exercise.");
        load();
      }
    },
    [workoutId, load],
  );

  const runSessionAction = useCallback(
    async (action: () => Promise<void>, failure: string) => {
      setBusy(true);
      try {
        await action();
        setError(null);
      } catch {
        setError(failure);
        load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const start = () =>
    runSessionAction(async () => {
      apply(await api.workouts.start(workoutId));
      setSaved(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, "Couldn't start the workout.");

  const finish = () =>
    runSessionAction(async () => {
      const began = startedAt;
      const { sessionId } = await api.workouts.finish(workoutId);
      setSaved({ sessionId, duration: began ? formatDuration(Date.now() - new Date(began).getTime()) : '' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await load();
    }, "Couldn't finish the workout.");

  const cancel = () =>
    runSessionAction(async () => apply(await api.workouts.cancel(workoutId)), "Couldn't cancel the workout.");

  const totalSets = exercises.reduce((n, x) => n + x.setCount, 0);
  const completedSets = exercises.reduce((n, x) => n + x.completedSetCount, 0);
  const active = startedAt !== null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: name }} />

      <View style={styles.header}>
        <SessionBar
          startedAt={startedAt}
          completedSets={completedSets}
          totalSets={totalSets}
          busy={busy}
          onStart={start}
          onFinish={finish}
          onCancel={cancel}
        />
        {saved && (
          <Pressable
            onPress={() => router.push({ pathname: '/workouts/history/[id]', params: { id: String(saved.sessionId) } })}
            style={styles.saved}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.savedText}>
              Workout saved to history{saved.duration ? ` · ${saved.duration}` : ''}
            </Text>
            <Text style={styles.savedLink}>View</Text>
          </Pressable>
        )}
        <Composer placeholder="Add an exercise…" onSubmit={add} />
      </View>

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surfaceRaised}
              />
            }
          >
            {exercises.length === 0 ? (
              <EmptyState title="No exercises yet" body="Add the exercises in this workout above." />
            ) : (
              exercises.map((x, index) => {
                const done = isExerciseDone(x);
                const sets = `${x.setCount} ${x.setCount === 1 ? 'set' : 'sets'}`;
                return (
                  <SimpleRow
                    key={x.id}
                    title={x.name}
                    done={done}
                    subtitle={
                      done
                        ? `All ${sets} done`
                        : active || x.completedSetCount > 0
                          ? `${x.completedSetCount}/${sets} done`
                          : sets
                    }
                    onPress={() =>
                      router.push({ pathname: '/workouts/exercises/[id]', params: { id: String(x.id), name: x.name } })
                    }
                    trailing={<Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
                    leading={
                      done ? (
                        <View style={[styles.number, styles.numberDone]} accessibilityLabel="Exercise complete">
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        </View>
                      ) : (
                        <View style={styles.number}>
                          <Text style={styles.numberText}>{index + 1}</Text>
                        </View>
                      )
                    }
                    onDelete={() => remove(x)}
                    deleteLabel={`Remove ${x.name}`}
                  />
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  savedText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  savedLink: { color: colors.success, fontSize: 14, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 16, flexGrow: 1 },
  number: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberDone: { backgroundColor: colors.success },
  numberText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
