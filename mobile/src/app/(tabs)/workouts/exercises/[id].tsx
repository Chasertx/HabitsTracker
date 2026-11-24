import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, type ExerciseSet } from '../../../../api';
import { EmptyState, ErrorBanner } from '../../../../components/Feedback';
import SetRow, { setColumns } from '../../../../components/SetRow';
import { colors, radius } from '../../../../theme';

// Default navigation header height (below the status bar); KeyboardAvoidingView needs it
// because it measures itself relative to the screen content, not the whole window.
const HEADER_HEIGHT = Platform.select({ ios: 44, default: 56 });

export default function ExerciseScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const exerciseId = Number(params.id);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [name, setName] = useState(params.name ?? '');
  const [workoutName, setWorkoutName] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api.exercises.get(exerciseId).then(
        (exercise) => {
          setName(exercise.name);
          setWorkoutName(exercise.workoutName);
          setSets(exercise.sets);
          setError(null);
        },
        () => setError("Couldn't load this exercise. Pull down to retry."),
      ),
    [exerciseId],
  );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // The server copies reps and weight from the last set, so repeating a set is one tap.
  const addSet = useCallback(async () => {
    setAdding(true);
    try {
      const created = await api.exercises.addSet(exerciseId);
      setSets((prev) => [...prev, created]);
      setError(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      setError("Couldn't add set.");
    } finally {
      setAdding(false);
    }
  }, [exerciseId]);

  const updateSet = useCallback(
    async (set: ExerciseSet, values: { reps?: number; weight?: number }) => {
      setSets((prev) => prev.map((s) => (s.id === set.id ? { ...s, ...values } : s)));
      try {
        await api.exercises.updateSet(set.id, values);
      } catch {
        setError("Couldn't save set.");
        load();
      }
    },
    [load],
  );

  const removeSet = useCallback(
    async (set: ExerciseSet) => {
      setSets((prev) => prev.filter((s) => s.id !== set.id));
      try {
        await api.exercises.removeSet(set.id);
      } catch {
        setError("Couldn't remove set.");
        load();
      }
    },
    [load],
  );

  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
  const summary = [
    workoutName,
    `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`,
    sets.length > 0 ? `${totalReps} reps` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
      keyboardVerticalOffset={insets.top + HEADER_HEIGHT}
    >
      <Stack.Screen options={{ title: name }} />

      <Text style={styles.summary}>{summary}</Text>

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />
        ) : (
          <ScrollView
            ref={scrollRef}
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
            {sets.length === 0 ? (
              <EmptyState title="No sets yet" body="Add a set, then enter its reps and weight." />
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.columnLabel, setColumns.set]}>SET</Text>
                  <Text style={[styles.columnLabel, setColumns.value]}>REPS</Text>
                  <Text style={[styles.columnLabel, setColumns.value]}>WEIGHT</Text>
                  <View style={setColumns.action} />
                </View>
                {sets.map((set, index) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    index={index}
                    onChange={updateSet}
                    onDelete={removeSet}
                  />
                ))}
              </>
            )}

            <Pressable
              onPress={addSet}
              disabled={adding}
              style={({ pressed }) => [styles.addSet, (pressed || adding) && styles.addSetPressed]}
              accessibilityRole="button"
              accessibilityLabel="Add set"
            >
              <Ionicons name="add" size={22} color={colors.accent} />
              <Text style={styles.addSetText}>Add set</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  summary: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 16,
  },
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  columnLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    marginTop: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  addSetPressed: { opacity: 0.7 },
  addSetText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
