import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { api, type ListItem } from '../../api';
import AddButton from '../../components/Composer';
import DraggableList from '../../components/DraggableList';
import { EmptyState, ErrorBanner } from '../../components/Feedback';
import ItemRow from '../../components/ItemRow';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, radius } from '../../theme';

const msUntilNextMidnight = () => {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
};

export default function RoutineScreen() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(() => new Date());
  const [dragging, setDragging] = useState(false);

  const load = useCallback(
    () =>
      api.items.list().then(
        (data) => {
          setItems(data);
          setError(null);
        },
        () => setError("Can't reach the server. Pull down to retry."),
      ),
    [],
  );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // At midnight, roll the date over and reload so checked items come back unchecked.
  useEffect(() => {
    const timer = setTimeout(() => {
      setToday(new Date());
      load();
    }, msUntilNextMidnight() + 1000);
    return () => clearTimeout(timer);
  }, [today, load]);

  // Timers don't fire while the app is in the background, so also refresh on resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setToday((prev) => (prev.toDateString() === new Date().toDateString() ? prev : new Date()));
      load();
    });
    return () => sub.remove();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const add = useCallback(async (title: string) => {
    try {
      const created = await api.items.create(title);
      setItems((prev) => [...prev, created]);
      setError(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setError("Couldn't add item. Check the server and try again.");
      throw e;
    }
  }, []);

  // Toggle, delete and reorder update the UI immediately, then roll back if the request fails.
  const toggle = useCallback(async (item: ListItem) => {
    const next = !item.isCompleted;
    const setDone = (done: boolean) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isCompleted: done } : i)));
    setDone(next);
    try {
      // The server works out the new streak; take its copy of the item.
      const updated = await api.items.setCompleted(item.id, next);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    } catch {
      setDone(!next);
      setError("Couldn't update item.");
    }
  }, []);

  const remove = useCallback(async (item: ListItem) => {
    let index = -1;
    setItems((prev) => {
      index = prev.findIndex((i) => i.id === item.id);
      return prev.filter((i) => i.id !== item.id);
    });
    try {
      await api.items.remove(item.id);
    } catch {
      setItems((prev) => {
        const copy = [...prev];
        copy.splice(index < 0 ? copy.length : index, 0, item);
        return copy;
      });
      setError("Couldn't delete item.");
    }
  }, []);

  const reorder = useCallback(
    (ids: number[]) => {
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]));
        return ids.map((id) => byId.get(id)).filter((i): i is ListItem => !!i);
      });
      api.items.reorder(ids).catch(() => {
        setError("Couldn't save the new order.");
        load();
      });
    },
    [load],
  );

  const dragStarted = useCallback(() => {
    setDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);
  const dragEnded = useCallback(() => setDragging(false), []);

  const renderItem = useCallback(
    (item: ListItem) => <ItemRow item={item} onToggle={toggle} onDelete={remove} />,
    [toggle, remove],
  );

  const doneCount = useMemo(() => items.filter((i) => i.isCompleted).length, [items]);
  const progress = items.length ? doneCount / items.length : 0;

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={today.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
        title="Routine"
        actions={<AddButton label="Add item" placeholder="Item name…" onSubmit={add} maxLength={200} />}
      />

      <View style={styles.body}>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />
        ) : (
          <ScrollView
            ref={scrollRef}
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
            {items.length === 0 ? (
              <EmptyState title="All clear" body="Add your first item above." />
            ) : (
              <DraggableList
                data={items}
                keyOf={(i) => i.id}
                renderItem={renderItem}
                onReorder={reorder}
                onDragStart={dragStarted}
                onDragEnd={dragEnded}
              />
            )}
            {items.length > 1 && (
              <Text style={styles.hint}>Hold to reorder · Swipe left to delete · 🔥 = days in a row</Text>
            )}
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.statsRow}>
          <Text style={styles.stats}>
            {items.length === 0 ? 'Nothing here yet' : `${doneCount} of ${items.length} done`}
          </Text>
          {items.length > 0 && <Text style={styles.statsPercent}>{Math.round(progress * 100)}%</Text>}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: 16 },
  loader: { flex: 1 },
  listContent: { paddingTop: 4, paddingBottom: 16, flexGrow: 1 },
  hint: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stats: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  statsPercent: { color: colors.text, fontSize: 14, fontWeight: '700' },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
