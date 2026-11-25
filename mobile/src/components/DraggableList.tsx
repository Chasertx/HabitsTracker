import { type ReactNode, useCallback, useEffect } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * A vertical list whose rows can be reordered by holding and dragging.
 *
 * Rows are absolutely positioned from a shared `order` array, so a drag is animated
 * entirely on the UI thread and the drop doesn't jump when the parent re-renders with
 * the new order. Render it inside a ScrollView; it sizes itself to its content.
 */

type Id = number;

type Props<T> = {
  data: T[];
  keyOf: (item: T) => Id;
  renderItem: (item: T) => ReactNode;
  /** Called with the full list of ids in their new order after a drop that moved something. */
  onReorder: (ids: Id[]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  gap?: number;
  longPressMs?: number;
};

type Shared = {
  order: SharedValue<Id[]>;
  heights: SharedValue<Record<Id, number>>;
  activeId: SharedValue<Id>;
  targetIndex: SharedValue<number>;
  dragTop: SharedValue<number>;
  startTop: SharedValue<number>;
  // True from drag start until the drop animation settles; other layout changes apply instantly.
  animating: SharedValue<boolean>;
  gap: number;
};

const NONE = -1;
const MOVE_MS = 180;

function topsFor(order: Id[], heights: Record<Id, number>, gap: number) {
  'worklet';
  const tops: Record<Id, number> = {};
  let y = 0;
  for (const id of order) {
    tops[id] = y;
    y += (heights[id] ?? 0) + gap;
  }
  return tops;
}

function moveTo(order: Id[], id: Id, index: number) {
  'worklet';
  const rest = order.filter((x) => x !== id);
  rest.splice(index, 0, id);
  return rest;
}

/** Index the dragged row should drop at, based on where its center is among the other rows. */
function dropIndex(order: Id[], heights: Record<Id, number>, gap: number, id: Id, top: number) {
  'worklet';
  const center = top + (heights[id] ?? 0) / 2;
  let y = 0;
  let index = 0;
  for (const other of order) {
    if (other === id) continue;
    const h = heights[other] ?? 0;
    if (center > y + h / 2) index++;
    y += h + gap;
  }
  return index;
}

export default function DraggableList<T>({
  data,
  keyOf,
  renderItem,
  onReorder,
  onDragStart,
  onDragEnd,
  gap = 10,
  longPressMs = 300,
}: Props<T>) {
  const shared: Shared = {
    order: useSharedValue<Id[]>(data.map(keyOf)),
    heights: useSharedValue<Record<Id, number>>({}),
    activeId: useSharedValue<Id>(NONE),
    targetIndex: useSharedValue(0),
    dragTop: useSharedValue(0),
    startTop: useSharedValue(0),
    animating: useSharedValue(false),
    gap,
  };
  const { order, heights } = shared;

  // Keep the UI-thread order in sync with the data the parent renders.
  const ids = data.map(keyOf).join(',');
  useEffect(() => {
    order.set(ids ? ids.split(',').map(Number) : []);
  }, [ids, order]);

  const containerStyle = useAnimatedStyle(() => {
    let total = 0;
    for (const id of order.get()) total += (heights.get()[id] ?? 0) + gap;
    return { height: Math.max(0, total - gap) };
  });

  const { animating } = shared;
  const handleDragEnd = useCallback(
    (moved: Id[] | null) => {
      // Let the dropped row settle into its slot before layout changes go back to instant.
      setTimeout(() => {
        animating.set(false);
      }, MOVE_MS + 40);
      onDragEnd?.();
      if (moved) onReorder(moved);
    },
    [animating, onDragEnd, onReorder],
  );
  const handleDragStart = useCallback(() => onDragStart?.(), [onDragStart]);

  return (
    <Animated.View style={containerStyle}>
      {data.map((item) => {
        const id = keyOf(item);
        return (
          <Row
            key={id}
            id={id}
            shared={shared}
            longPressMs={longPressMs}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {renderItem(item)}
          </Row>
        );
      })}
    </Animated.View>
  );
}

type RowProps = {
  id: Id;
  shared: Shared;
  longPressMs: number;
  onDragStart: () => void;
  onDragEnd: (moved: Id[] | null) => void;
  children: ReactNode;
};

function Row({ id, shared, longPressMs, onDragStart, onDragEnd, children }: RowProps) {
  const { order, heights, activeId, targetIndex, dragTop, startTop, animating, gap } = shared;

  const pan = usePanGesture({
    activateAfterLongPress: longPressMs,
    onActivate: () => {
      'worklet';
      if (activeId.get() !== NONE) return;
      const top = topsFor(order.get(), heights.get(), gap)[id] ?? 0;
      startTop.set(top);
      dragTop.set(top);
      targetIndex.set(order.get().indexOf(id));
      animating.set(true);
      activeId.set(id);
      scheduleOnRN(onDragStart);
    },
    onUpdate: (e) => {
      'worklet';
      if (activeId.get() !== id) return;
      dragTop.set(startTop.get() + e.translationY);
      targetIndex.set(dropIndex(order.get(), heights.get(), gap, id, dragTop.get()));
    },
    onFinalize: () => {
      'worklet';
      if (activeId.get() !== id) return;
      const before = order.get();
      const after = moveTo(before, id, targetIndex.get());
      const moved = after.some((x, i) => x !== before[i]);
      order.set(after);
      activeId.set(NONE);
      scheduleOnRN(onDragEnd, moved ? after : null);
    },
  });

  const style = useAnimatedStyle(() => {
    const active = activeId.get();
    const isActive = active === id;
    const ord = active === NONE ? order.get() : moveTo(order.get(), active, targetIndex.get());
    const top = topsFor(ord, heights.get(), gap)[id] ?? 0;

    return {
      top: isActive ? dragTop.get() : animating.get() ? withTiming(top, { duration: MOVE_MS }) : top,
      opacity: heights.get()[id] === undefined ? 0 : 1,
      zIndex: isActive ? 10 : 0,
      elevation: isActive ? 12 : 0,
      shadowOpacity: isActive ? 0.35 : 0,
      transform: [{ scale: withTiming(isActive ? 1.03 : 1, { duration: 150 }) }],
    };
  });

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      heights.modify((v) => {
        'worklet';
        v[id] = h;
        return v;
      });
    },
    [heights, id],
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, style]} onLayout={onLayout}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
});
