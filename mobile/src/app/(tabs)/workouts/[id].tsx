import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api, type Exercise } from '../../../api';
import Composer from '../../../components/Composer';
import { EmptyState, ErrorBanner } from '../../../components/Feedback';
import SimpleRow from '../../../components/SimpleRow';
import { colors, radius } from '../../../theme';

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const workoutId = Number(params.id);
  const [name, setName] = useState(params.name ?? '');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api.workouts.get(workoutId).then(
        (workout) => {
          setName(workout.name);
          setExercises(workout.exercises);
          setError(null);
        },
        () => setError("Couldn't load this workout. Pull down to retry."),
      ),
    [workoutId],
  );

  // Reload whenever this screen is shown so set counts reflect edits made to an exercise.
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

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: name }} />

      <View style={styles.header}>
        <Text style={styles.count}>
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
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
              exercises.map((x, index) => (
                <SimpleRow
                  key={x.id}
                  title={x.name}
                  subtitle={`${x.setCount} ${x.setCount === 1 ? 'set' : 'sets'}`}
                  onPress={() =>
                    router.push({ pathname: '/workouts/exercises/[id]', params: { id: String(x.id), name: x.name } })
                  }
                  trailing={<Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
                  leading={
                    <View style={styles.number}>
                      <Text style={styles.numberText}>{index + 1}</Text>
                    </View>
                  }
                  onDelete={() => remove(x)}
                  deleteLabel={`Remove ${x.name}`}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  count: { color: colors.textMuted, fontSize: 14, fontWeight: '500', marginBottom: 14, marginLeft: 6 },
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 16, flexGrow: 1 },
  number: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
});
