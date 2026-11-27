import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { api, type ListItem } from '../api';
import { RoutineWidget } from './RoutineWidget';
import { WorkoutWidget, type ActiveState, type WorkoutWidgetState } from './WorkoutWidget';

export const ROUTINE_WIDGET = 'Routine';
export const WORKOUT_WIDGET = 'Workout';

// Android redraws a whole widget on every update, so avoid updates that change nothing.
// These remember what each widget last showed (while this JS runtime is alive).
let routineItems: ListItem[] | null = null;
let routineDrawn = '';
let workoutState: WorkoutWidgetState | null = null;
let workoutDrawn = '';

const routineKey = (items: ListItem[]) =>
  items.map((i) => `${i.id}:${i.title}:${+i.isCompleted}:${i.currentStreak}`).join('|');

/** Runs in the background when a widget is added, updated, resized or tapped. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  if (props.widgetInfo.widgetName === WORKOUT_WIDGET) return workoutTask(props);
  return routineTask(props);
}

// ---- Routine ----

async function routineTask({
  widgetAction,
  clickAction,
  clickActionData,
  renderWidget,
  widgetInfo,
}: WidgetTaskHandlerProps) {
  const height = widgetInfo.height;
  const draw = (items: ListItem[], force = false) => {
    const key = routineKey(items) + `#${height}`;
    if (!force && key === routineDrawn) return;
    routineItems = items;
    routineDrawn = key;
    renderWidget(<RoutineWidget stamp={Date.now()} items={items} height={height} />);
  };

  const clicked = widgetAction === 'WIDGET_CLICK';
  if (clicked && clickAction === 'TOGGLE' && clickActionData) {
    const id = Number(clickActionData.id);
    const next = !clickActionData.done;
    // Show the tick straight away, then save.
    if (routineItems) draw(routineItems.map((i) => (i.id === id ? { ...i, isCompleted: next } : i)));
    try {
      const updated = await api.items.setCompleted(id, next);
      if (routineItems) return draw(routineItems.map((i) => (i.id === id ? { ...i, ...updated } : i)));
    } catch {
      // Fall through and redraw with whatever the server has.
    }
  }

  try {
    // Added, resized or periodic update: always draw so the widget has content.
    draw(await api.items.list(), !clicked);
  } catch {
    routineDrawn = '';
    renderWidget(<RoutineWidget stamp={Date.now()} items={null} error height={height} />);
  }
}

/** Redraws every Routine widget with the given items (call after changes in the app). */
export function updateRoutineWidget(items: ListItem[]) {
  const key = routineKey(items);
  if (routineDrawn.startsWith(key + '#')) return;
  routineItems = items;
  requestWidgetUpdate({
    widgetName: ROUTINE_WIDGET,
    renderWidget: (info) => {
      routineDrawn = `${key}#${info.height}`;
      return <RoutineWidget stamp={Date.now()} items={items} height={info.height} />;
    },
  }).catch(() => {});
}

// ---- Workout ----

/** The running workout and its next set, or the list of workouts to start one. */
async function loadWorkout(): Promise<WorkoutWidgetState> {
  const workouts = await api.workouts.list();
  const running = workouts.find((w) => w.activeSessionStartedAt);
  if (!running) return { kind: 'pick', workouts };
  const workout = await api.workouts.get(running.id);
  const exercise = workout.exercises.find((x) => x.completedSetCount < x.setCount) ?? null;
  if (!exercise) return { kind: 'active', workout, exercise: null, set: null, setNumber: 0 };
  const { sets } = await api.exercises.get(exercise.id);
  const index = sets.findIndex((s) => !s.isCompleted);
  return { kind: 'active', workout, exercise, set: sets[index] ?? null, setNumber: index + 1 };
}

async function workoutTask({
  widgetAction,
  clickAction,
  clickActionData,
  renderWidget,
  widgetInfo,
}: WidgetTaskHandlerProps) {
  const height = widgetInfo.height;
  const draw = (state: WorkoutWidgetState, force = false) => {
    const key = JSON.stringify(state) + `#${height}`;
    if (!force && key === workoutDrawn) return;
    workoutState = state;
    workoutDrawn = key;
    renderWidget(<WorkoutWidget state={state} height={height} />);
  };
  const active = workoutState?.kind === 'active' ? workoutState : null;
  const showBusy = (busy: string) => active && draw({ ...active, busy, confirmFinish: false });

  if (widgetAction === 'WIDGET_CLICK' && clickActionData) {
    const id = Number(clickActionData.id);
    try {
      switch (clickAction) {
        case 'START':
          draw({ kind: 'loading' });
          await api.workouts.start(id);
          break;
        case 'SET_DONE':
          showBusy('Saving…');
          await api.exercises.updateSet(Number(clickActionData.setId), { isCompleted: true });
          break;
        case 'PAUSE':
          showBusy('Pausing…');
          await api.workouts.pause(id);
          break;
        case 'RESUME':
          showBusy('Resuming…');
          await api.workouts.resume(id);
          break;
        case 'FINISH_ASK':
          // Ask once; the widget turns the Finish button red for the confirming tap.
          if (active) return draw({ ...active, confirmFinish: true } as ActiveState);
          break;
        case 'FINISH':
          showBusy('Finishing…');
          await api.workouts.finish(id);
          break;
      }
    } catch {
      // Redraw with whatever the server has.
    }
  }

  try {
    draw(await loadWorkout(), widgetAction !== 'WIDGET_CLICK');
  } catch {
    draw({ kind: 'error' }, true);
  }
}

/** Reloads every Workout widget from the server (call after workout changes in the app). */
export function updateWorkoutWidget() {
  loadWorkout().then(
    (state) => {
      if (JSON.stringify(state) === JSON.stringify(workoutState)) return;
      workoutState = state;
      return requestWidgetUpdate({
        widgetName: WORKOUT_WIDGET,
        renderWidget: (info) => {
          workoutDrawn = `${JSON.stringify(state)}#${info.height}`;
          return <WorkoutWidget state={state} height={info.height} />;
        },
      });
    },
    () => {},
  );
}
