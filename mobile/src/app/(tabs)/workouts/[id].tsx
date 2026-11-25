import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, type Exercise, type WorkoutDetail } from '../../../api';
import AddButton from '../../../components/Composer';
import { EmptyState, ErrorBanner } from '../../../components/Feedback';
import SessionBar, { type SessionClock, WorkoutTimer } from '../../../components/SessionBar';
import DraggableList from '../../../components/DraggableList';
import SimpleRow from '../../../components/SimpleRow';
import { formatDaysSince, formatDuration } from '../../../format';
import { colors, radius } from '../../../theme';

const isExerciseDone = (x: Exercise) => x.setCount > 0 && x.completedSetCount === x.setCount;

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const workoutId = Number(params.id);
  const [name, setName] = useState(params.name ?? '');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [clock, setClock] = useState<SessionClock>({ startedAt: null, pausedAt: null, pausedSeconds: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ sessionId: number; duration: string } | null>(null);

  const apply = useCallback((workout: WorkoutDetail) => {
    setName(workout.name);
    setExercises(workout.exercises);
    setClock({
      startedAt: workout.activeSessionStartedAt,
      pausedAt: workout.activeSessionPausedAt,
      pausedSeconds: workout.activeSessionPausedSeconds,
    });
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

  const reorder = useCallback(
    (ids: number[]) => {
      setExercises((prev) => {
        const byId = new Map(prev.map((x) => [x.id, x]));
        return ids.map((id) => byId.get(id)).filter((x): x is Exercise => !!x);
      });
      api.workouts.reorderExercises(workoutId, ids).catch(() => {
        setError("Couldn't save the new order.");
        load();
      });
    },
    [workoutId, load],
  );

  const dragStarted = useCallback(() => {
    setDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);
  const dragEnded = useCallback(() => setDragging(false), []);

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
      const { sessionId } = await api.workouts.finish(workoutId);
      const session = await api.history.get(sessionId).catch(() => null);
      setSaved({ sessionId, duration: session ? formatDuration(session.durationSeconds * 1000) : '' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await load();
    }, "Couldn't finish the workout.");

  const pause = () =>
    runSessionAction(async () => apply(await api.workouts.pause(workoutId)), "Couldn't pause the workout.");

  const resume = () =>
    runSessionAction(async () => apply(await api.workouts.resume(workoutId)), "Couldn't resume the workout.");

  const cancel = () =>
    runSessionAction(async () => apply(await api.workouts.cancel(workoutId)), "Couldn't cancel the workout.");

  const totalSets = exercises.reduce((n, x) => n + x.setCount, 0);
  const completedSets = exercises.reduce((n, x) => n + x.completedSetCount, 0);
  const active = clock.startedAt !== null;

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => <AddButton label="Add exercise" placeholder="Exercise name…" onSubmit={add} compact />,
        }}
      />

      <View style={styles.header}>
        <WorkoutTimer clock={clock} />
        <SessionBar
          clock={clock}
          completedSets={completedSets}
          totalSets={totalSets}
          busy={busy}
          onStart={start}
          onPause={pause}
          onResume={resume}
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
            <Text style={styles.savedText}>Workout saved to history{saved.duration ? ` · ${saved.duration}` : ''}</Text>
            <Text style={styles.savedLink}>View</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!dragging}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                enabled={!dragging}
                tintColor={colors.accent}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surfaceRaised}
              />
            }
          >
            {exercises.length === 0 ? (
              <EmptyState title="No exercises yet" body="Tap + to add the exercises in this workout." />
            ) : (
              <DraggableList
                data={exercises}
                keyOf={(x) => x.id}
                onReorder={reorder}
                onDragStart={dragStarted}
                onDragEnd={dragEnded}
                renderItem={(x) => {
                  const index = exercises.indexOf(x);
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
                        router.push({
                          pathname: '/workouts/exercises/[id]',
                          params: { id: String(x.id), name: x.name },
                        })
                      }
                      trailing={
                        <View
                          style={styles.since}
                          accessibilityLabel={
                            x.lastDoneAt ? `Last done ${formatDaysSince(x.lastDoneAt)} ago` : 'Not done yet'
                          }
                        >
                          <Text style={styles.sinceValue}>{x.lastDoneAt ? formatDaysSince(x.lastDoneAt) : '—'}</Text>
                          <Text style={styles.sinceLabel}>
                            {x.lastDoneAt && formatDaysSince(x.lastDoneAt) !== 'Today' ? 'ago' : 'last done'}
                          </Text>
                        </View>
                      }
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
                }}
              />
            )}
            {exercises.length > 1 && <Text style={styles.hint}>Hold to reorder · Swipe left to remove</Text>}
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
  since: { alignItems: 'flex-end', minWidth: 56 },
  sinceValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  sinceLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  hint: { color: colors.textFaint, fontSize: 13, textAlign: 'center', marginTop: 12 },
  numberDone: { backgroundColor: colors.success },
  numberText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
