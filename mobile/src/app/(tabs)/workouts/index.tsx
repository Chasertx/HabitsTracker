import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { api, type WorkoutSummary } from '../../../api';
import AddButton from '../../../components/Composer';
import { EmptyState, ErrorBanner } from '../../../components/Feedback';
import { formatDaysSince } from '../../../format';
import ScreenHeader from '../../../components/ScreenHeader';
import SimpleRow from '../../../components/SimpleRow';
import { colors, radius } from '../../../theme';

export default function WorkoutsScreen() {
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

  // Reload whenever the tab is shown so counts and "in progress" reflect changes made elsewhere.
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

  const remove = useCallback(
    async (workout: WorkoutSummary) => {
      setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
      try {
        await api.workouts.remove(workout.id);
      } catch {
        setError("Couldn't delete workout.");
        load();
      }
    },
    [load],
  );

  const open = (workout: WorkoutSummary) =>
    router.push({
      pathname: '/workouts/[id]',
      params: { id: String(workout.id), name: workout.name },
    });

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow="Training"
        title="Workouts"
        actions={
          <>
            <Pressable
              onPress={() => router.push('/workouts/history')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Workout history"
            >
              <Ionicons name="time-outline" size={26} color={colors.text} />
            </Pressable>
            <AddButton label="New workout" placeholder="Workout name…" onSubmit={create} />
          </>
        }
      />

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
              <EmptyState title="No workouts yet" body="Tap + to create one." />
            ) : (
              workouts.map((w) => {
                const active = w.activeSessionStartedAt !== null;
                const count = `${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercise' : 'exercises'}`;
                return (
                  <SimpleRow
                    key={w.id}
                    title={w.name}
                    subtitle={active ? `In progress · ${count}` : count}
                    highlight={active}
                    leading={
                      <View style={[styles.badge, active && styles.badgeActive]}>
                        <Ionicons
                          name={active ? 'play' : 'barbell'}
                          size={18}
                          color={active ? '#fff' : colors.accent}
                        />
                      </View>
                    }
                    trailing={
                      <View
                        style={styles.since}
                        accessibilityLabel={
                          w.lastDoneAt ? `Last done ${formatDaysSince(w.lastDoneAt)}` : 'Not done yet'
                        }
                      >
                        <Text style={styles.sinceValue}>{w.lastDoneAt ? formatDaysSince(w.lastDoneAt) : '—'}</Text>
                        <Text style={styles.sinceLabel}>
                          {w.lastDoneAt && formatDaysSince(w.lastDoneAt) !== 'Today' ? 'ago' : 'last done'}
                        </Text>
                      </View>
                    }
                    onPress={() => open(w)}
                    onDelete={() => remove(w)}
                    deleteLabel={`Delete ${w.name}`}
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
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 16, flexGrow: 1 },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  since: { alignItems: 'flex-end', minWidth: 56 },
  sinceValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  sinceLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600' },
  badgeActive: { backgroundColor: colors.success },
});
