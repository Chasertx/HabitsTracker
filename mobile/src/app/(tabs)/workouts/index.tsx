import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { api, type WorkoutSummary } from '../../../api';
import Composer from '../../../components/Composer';
import { EmptyState, ErrorBanner } from '../../../components/Feedback';
import SimpleRow from '../../../components/SimpleRow';
import { colors, radius } from '../../../theme';

export default function WorkoutsScreen() {
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setWorkouts(await api.workouts.list());
      setError(null);
    } catch {
      setError("Can't reach the server. Pull down to retry.");
    }
  }, []);

  // Reload whenever the tab is shown so exercise counts reflect edits made in a workout.
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

  const create = useCallback(async (name: string) => {
    try {
      const created = await api.workouts.create(name);
      setWorkouts((prev) => [...prev, created]);
      setError(null);
    } catch (e) {
      setError("Couldn't create workout.");
      throw e;
    }
  }, []);

  const remove = useCallback(async (workout: WorkoutSummary) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
    try {
      await api.workouts.remove(workout.id);
    } catch {
      setError("Couldn't delete workout.");
      load();
    }
  }, [load]);

  const open = (workout: WorkoutSummary) =>
    router.push({ pathname: '/workouts/[id]', params: { id: String(workout.id), name: workout.name } });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.eyebrow}>Training</Text>
        <Text style={styles.heading}>Workouts</Text>
        <Composer placeholder="New workout name…" onSubmit={create} />
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
            {workouts.length === 0 ? (
              <EmptyState title="No workouts yet" body="Name a workout above to create it." />
            ) : (
              workouts.map((w) => (
                <SimpleRow
                  key={w.id}
                  title={w.name}
                  subtitle={`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercise' : 'exercises'}`}
                  leading={
                    <View style={styles.badge}>
                      <Ionicons name="barbell" size={18} color={colors.accent} />
                    </View>
                  }
                  trailing={<Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
                  onPress={() => open(w)}
                  onDelete={() => remove(w)}
                  deleteLabel={`Delete ${w.name}`}
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
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  heading: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 18,
    marginLeft: 6,
    letterSpacing: -0.5,
  },
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 16, flexGrow: 1 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
