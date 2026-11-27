import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import type { Exercise, ExerciseSet, WorkoutDetail, WorkoutSummary } from '../api';
import { formatWeight } from '../format';
import { rowsThatFit, wc } from './colors';

export type ActiveState = {
  kind: 'active';
  workout: WorkoutDetail;
  /** The first exercise with sets left, and its next unchecked set; null once every set is done. */
  exercise: Exercise | null;
  set: ExerciseSet | null;
  setNumber: number;
  /** Shown in place of the current set while an action is being saved. */
  busy?: string;
  /** Finish was tapped once; the next tap finishes. */
  confirmFinish?: boolean;
};

export type WorkoutWidgetState =
  { kind: 'loading' } | { kind: 'error' } | { kind: 'pick'; workouts: WorkoutSummary[] } | ActiveState;

type Props = { state: WorkoutWidgetState; height?: number };

type ButtonProps = { label: string; action: string; data?: Record<string, unknown>; color: ColorProp; flex?: number };

function Button({ label, action, data, color, flex = 1 }: ButtonProps) {
  return (
    <FlexWidget
      clickAction={action}
      clickActionData={data}
      accessibilityLabel={label}
      style={{
        flex,
        height: 40,
        borderRadius: 12,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
      }}
    >
      <TextWidget text={label} style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }} />
    </FlexWidget>
  );
}

/** Home-screen widget: pick a workout to start, then check off its sets one at a time. */
export function WorkoutWidget({ state, height }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: wc.background,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      {state.kind === 'active' ? <Active {...state} /> : <Pick state={state} height={height} />}
    </FlexWidget>
  );
}

function Pick({ state, height }: Props) {
  const workouts = state.kind === 'pick' ? state.workouts : [];
  const max = rowsThatFit(height);
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'habits:///workouts' }} style={{ marginBottom: 10 }}>
        <TextWidget text="Workouts" style={{ fontSize: 18, fontWeight: '700', color: wc.text }} />
      </FlexWidget>
      {state.kind === 'loading' || state.kind === 'error' ? (
        <TextWidget
          text={state.kind === 'error' ? "Can't reach the server · tap to retry" : 'Loading…'}
          clickAction="REFRESH"
          style={{ fontSize: 14, color: wc.muted }}
        />
      ) : workouts.length === 0 ? (
        <TextWidget text="No workouts yet · add one in the app" style={{ fontSize: 14, color: wc.muted }} />
      ) : (
        workouts.slice(0, max).map((w) => (
          <FlexWidget
            key={w.id}
            style={{
              width: 'match_parent',
              height: 36,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: wc.surface,
              borderRadius: 12,
              paddingLeft: 12,
              paddingRight: 4,
              marginBottom: 6,
            }}
          >
            <FlexWidget
              clickAction="OPEN_URI"
              clickActionData={{ uri: `habits:///workouts/${w.id}` }}
              style={{ flex: 1 }}
            >
              <TextWidget
                text={w.name}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 15, fontWeight: '600', color: wc.text }}
              />
            </FlexWidget>
            {w.setCount > 0 ? (
              <FlexWidget
                clickAction="START"
                clickActionData={{ id: w.id }}
                accessibilityLabel={`Start ${w.name}`}
                style={{
                  height: 28,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: wc.accent,
                  justifyContent: 'center',
                }}
              >
                <TextWidget text="Start" style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }} />
              </FlexWidget>
            ) : null}
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}

function Active({ workout, exercise, set, setNumber, busy, confirmFinish }: ActiveState) {
  const paused = !!workout.activeSessionPausedAt;
  const total = workout.exercises.reduce((n, x) => n + x.setCount, 0);
  const done = workout.exercises.reduce((n, x) => n + x.completedSetCount, 0);

  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: `habits:///workouts/${workout.id}` }}
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}
      >
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={workout.name}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 16, fontWeight: '700', color: wc.text }}
          />
        </FlexWidget>
        <TextWidget
          text={paused ? 'Paused' : `${done}/${total} sets`}
          style={{ fontSize: 13, fontWeight: '700', color: paused ? wc.flame : wc.success }}
        />
      </FlexWidget>

      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'column', justifyContent: 'center' }}>
        {busy ? (
          <TextWidget text={busy} style={{ fontSize: 15, color: wc.muted }} />
        ) : exercise && set ? (
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: `habits:///workouts/exercises/${exercise.id}` }}
            style={{ flexDirection: 'column' }}
          >
            <TextWidget
              text={exercise.name}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 20, fontWeight: '800', color: wc.text }}
            />
            <TextWidget
              text={`Set ${setNumber} of ${exercise.setCount} · ${set.reps} reps × ${formatWeight(set.weight)}`}
              style={{ fontSize: 14, color: wc.muted, marginTop: 2 }}
            />
          </FlexWidget>
        ) : (
          <TextWidget text="Every set is done 🎉" style={{ fontSize: 18, fontWeight: '700', color: wc.success }} />
        )}
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', marginLeft: -6 }}>
        {paused ? (
          <Button label="Resume" action="RESUME" data={{ id: workout.id }} color={wc.accent} />
        ) : set ? (
          <Button label="✓ Done" action="SET_DONE" data={{ setId: set.id }} color={wc.success} flex={2} />
        ) : null}
        {!paused && <Button label="Pause" action="PAUSE" data={{ id: workout.id }} color={wc.raised} />}
        <Button
          label={confirmFinish ? 'Sure?' : 'Finish'}
          action={confirmFinish ? 'FINISH' : 'FINISH_ASK'}
          data={{ id: workout.id }}
          color={confirmFinish ? wc.danger : set ? wc.raised : wc.accent}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
