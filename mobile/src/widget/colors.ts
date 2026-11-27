// Widget colours match the app's theme (widgets need plain hex strings).
export const wc = {
  background: '#1A1D27',
  surface: '#242836',
  raised: '#2E3343',
  text: '#F4F5FA',
  muted: '#A3A8BC',
  faint: '#6E7489',
  accent: '#8E80FF',
  success: '#34C77B',
  danger: '#FF6B81',
  flame: '#FF8A2B',
} as const;

/** How many ~42dp rows fit in a widget of this height under its ~56dp header. */
export const rowsThatFit = (heightDp: number | undefined) => Math.max(1, Math.floor(((heightDp ?? 180) - 56) / 42));
