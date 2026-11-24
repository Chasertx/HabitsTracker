import { Platform } from 'react-native';

export type ListItem = {
  id: number;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
};

export type WorkoutSummary = {
  id: number;
  name: string;
  exerciseCount: number;
  createdAt: string;
};

export type Exercise = {
  id: number;
  workoutId: number;
  name: string;
  sortOrder: number;
  setCount: number;
};

export type ExerciseSet = {
  id: number;
  exerciseId: number;
  reps: number;
  weight: number;
  sortOrder: number;
};

export type ExerciseDetail = {
  id: number;
  workoutId: number;
  workoutName: string;
  name: string;
  sets: ExerciseSet[];
};

export type WorkoutDetail = {
  id: number;
  name: string;
  createdAt: string;
  exercises: Exercise[];
};

// Set EXPO_PUBLIC_API_URL to point at a deployed API (release builds get it from eas.json).
// Without it, the app talks to a local API: the Android emulator reaches the host
// machine's localhost via 10.0.2.2.
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:5248' : 'http://localhost:5248');

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
      request<ListItem>(`/items/${id}`, json('PATCH', { isCompleted })),
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
    removeExercise: (workoutId: number, exerciseId: number) =>
      request<void>(`/workouts/${workoutId}/exercises/${exerciseId}`, { method: 'DELETE' }),
  },
  exercises: {
    get: (id: number) => request<ExerciseDetail>(`/exercises/${id}`),
    /** Leave values out to copy them from the exercise's last set. */
    addSet: (exerciseId: number, values: Partial<Pick<ExerciseSet, 'reps' | 'weight'>> = {}) =>
      request<ExerciseSet>(`/exercises/${exerciseId}/sets`, json('POST', values)),
    updateSet: (setId: number, values: Partial<Pick<ExerciseSet, 'reps' | 'weight'>>) =>
      request<ExerciseSet>(`/sets/${setId}`, json('PATCH', values)),
    removeSet: (setId: number) => request<void>(`/sets/${setId}`, { method: 'DELETE' }),
  },
};
