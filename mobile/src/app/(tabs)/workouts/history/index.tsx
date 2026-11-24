import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { api, type SessionSummary } from '../../../../api';
import { EmptyState, ErrorBanner } from '../../../../components/Feedback';
import SimpleRow from '../../../../components/SimpleRow';
import { formatDateTime, formatDuration, formatVolume } from '../../../../format';
import { colors, radius } from '../../../../theme';

/** Every finished workout session, newest first. */
export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api.history.list().then(
        (data) => {
          setSessions(data);
          setError(null);
        },
        () => setError("Can't reach the server. Pull down to retry."),
      ),
    [],
  );

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

  const remove = useCallback(
    async (session: SessionSummary) => {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      try {
        await api.history.remove(session.id);
      } catch {
        setError("Couldn't delete that session.");
        load();
      }
    },
    [load],
  );

  const totalMs = sessions.reduce(
    (sum, s) => sum + (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()),
    0,
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'History' }} />

      {sessions.length > 0 && (
        <View style={styles.stats}>
          <Stat label="Workouts" value={String(sessions.length)} />
          <Stat label="Time trained" value={formatDuration(totalMs)} />
          <Stat label="Volume" value={formatVolume(sessions.reduce((sum, s) => sum + s.volume, 0))} />
        </View>
      )}

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
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
            {sessions.length === 0 ? (
              <EmptyState
                title="No workouts logged yet"
                body="Start a workout, then tap Finish to save it here."
              />
            ) : (
              sessions.map((s) => {
                const duration = formatDuration(new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime());
                return (
                  <SimpleRow
                    key={s.id}
                    title={s.workoutName}
                    subtitle={`${formatDateTime(s.startedAt)}\n${duration} · ${s.completedSetCount}/${s.setCount} sets · ${formatVolume(s.volume)} volume`}
                    leading={
                      <View style={styles.badge}>
                        <Ionicons name="checkmark-done" size={18} color={colors.success} />
                      </View>
                    }
                    trailing={<Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
                    onPress={() =>
                      router.push({ pathname: '/workouts/history/[id]', params: { id: String(s.id) } })
                    }
                    onDelete={() => remove(s)}
                    deleteLabel={`Delete ${s.workoutName} from history`}
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
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
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
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 16, flexGrow: 1 },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
