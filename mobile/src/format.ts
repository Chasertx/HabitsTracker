/** 75 seconds → "1:15"; 3725 seconds → "1:02:05". */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** A duration in words: "45 min", "1 h 05 min", "under a minute". */
export function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** "Tue, Nov 24 · 6:30 PM" in the phone's locale. */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

/** Weight without trailing zeros: 145.50 → "145.5". */
export const formatWeight = (w: number) => String(Math.round(w * 100) / 100);

/** Total lifted, e.g. 12345 → "12,345". */
export const formatVolume = (v: number) => Math.round(v).toLocaleString();
