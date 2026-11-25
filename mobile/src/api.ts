import { Platform } from 'react-native';

export type ListItem = {
  id: number;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  /** Consecutive days done, ending today (or yesterday if today isn't done yet). */
  currentStreak: number;
  /** Longest run of consecutive days ever. */
  bestStreak: number;
};

export type WorkoutSummary = {
  id: number;
  name: string;
  exerciseCount: number;
  setCount: number;
  createdAt: string;
  /** Set while a session of this workout is running. */
  activeSessionStartedAt: string | null;
  /** Set while that session is paused. */
  activeSessionPausedAt: string | null;
};

export type Exercise = {
  id: number;
  workoutId: number;
  name: string;
  sortOrder: number;
  setCount: number;
  completedSetCount: number;
  /** When a finished session of this workout last included a completed set of this exercise. */
  lastDoneAt: string | null;
};

export type ExerciseSet = {
  id: number;
  exerciseId: number;
  reps: number;
  weight: number;
  isCompleted: boolean;
  sortOrder: number;
};

export type ExerciseDetail = {
  id: number;
  workoutId: number;
  workoutName: string;
  workoutActiveSessionStartedAt: string | null;
  name: string;
  sets: ExerciseSet[];
};

export type WorkoutDetail = {
  id: number;
  name: string;
  createdAt: string;
  activeSessionStartedAt: string | null;
  activeSessionPausedAt: string | null;
  /** Seconds paused so far, not counting a pause in progress. */
  activeSessionPausedSeconds: number;
  exercises: Exercise[];
};

export type SessionSummary = {
  id: number;
  workoutId: number | null;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  /** Time spent working out, excluding pauses. */
  durationSeconds: number;
  exerciseCount: number;
  setCount: number;
  completedSetCount: number;
  /** Reps × weight over completed sets. */
  volume: number;
};

export type SessionDetail = {
  id: number;
  workoutId: number | null;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  exercises: {
    id: number;
    name: string;
    sets: { id: number; reps: number; weight: number; isCompleted: boolean }[];
  }[];
};

// Set EXPO_PUBLIC_API_URL to point at a deployed API (release builds get it from eas.json).
// Without it, the app talks to a local API: the Android emulator reaches the host
// machine's localhost via 10.0.2.2.
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:5248' : 'http://localhost:5248');

// Sent as X-Api-Key when set; must match the API's ApiKey setting.
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

// The server resets checked routine items once midnight passes in this time zone.
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const api = {
  items: {
    list: () => request<ListItem[]>(`/items?timeZone=${encodeURIComponent(TIME_ZONE)}`),
    create: (title: string) => request<ListItem>('/items', json('POST', { title })),
    setCompleted: (id: number, isCompleted: boolean) =>
      request<ListItem>(`/items/${id}?timeZone=${encodeURIComponent(TIME_ZONE)}`, json('PATCH', { isCompleted })),
    reorder: (ids: number[]) => request<void>('/items/order', json('PUT', { ids })),
    remove: (id: number) => request<void>(`/items/${id}`, { method: 'DELETE' }),
  },
  workouts: {
    list: () => request<WorkoutSummary[]>('/workouts'),
    get: (id: number) => request<WorkoutDetail>(`/workouts/${id}`),
    create: (name: string) => request<WorkoutSummary>('/workouts', json('POST', { name })),
    remove: (id: number) => request<void>(`/workouts/${id}`, { method: 'DELETE' }),
    addExercise: (workoutId: number, name: string) =>
      request<Exercise>(`/workouts/${workoutId}/exercises`, json('POST', { name })),
    reorderExercises: (workoutId: number, ids: number[]) =>
      request<void>(`/workouts/${workoutId}/exercises/order`, json('PUT', { ids })),
    removeExercise: (workoutId: number, exerciseId: number) =>
      request<void>(`/workouts/${workoutId}/exercises/${exerciseId}`, { method: 'DELETE' }),
    /** Starts a session with all sets unchecked. */
    start: (id: number) => request<WorkoutDetail>(`/workouts/${id}/start`, { method: 'POST' }),
    /** Logs the running session to history and resets the workout. */
    finish: (id: number) => request<{ sessionId: number }>(`/workouts/${id}/finish`, { method: 'POST' }),
    pause: (id: number) => request<WorkoutDetail>(`/workouts/${id}/pause`, { method: 'POST' }),
    resume: (id: number) => request<WorkoutDetail>(`/workouts/${id}/resume`, { method: 'POST' }),
    /** Abandons the running session without logging it. */
    cancel: (id: number) => request<WorkoutDetail>(`/workouts/${id}/cancel`, { method: 'POST' }),
  },
  exercises: {
    get: (id: number) => request<ExerciseDetail>(`/exercises/${id}`),
    /** Leave values out to copy them from the exercise's last set. */
    addSet: (exerciseId: number, values: Partial<Pick<ExerciseSet, 'reps' | 'weight'>> = {}) =>
      request<ExerciseSet>(`/exercises/${exerciseId}/sets`, json('POST', values)),
    updateSet: (setId: number, values: Partial<Pick<ExerciseSet, 'reps' | 'weight' | 'isCompleted'>>) =>
      request<ExerciseSet>(`/sets/${setId}`, json('PATCH', values)),
    removeSet: (setId: number) => request<void>(`/sets/${setId}`, { method: 'DELETE' }),
  },
  history: {
    list: () => request<SessionSummary[]>('/history'),
    get: (id: number) => request<SessionDetail>(`/history/${id}`),
    remove: (id: number) => request<void>(`/history/${id}`, { method: 'DELETE' }),
  },
};
