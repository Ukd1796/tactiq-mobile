// Design tokens — mirrors the web app's CSS variables exactly
export const colors = {
  primary:     '#7C5CE6',   // hsl(239 84% 67%)
  success:     '#22C55E',   // hsl(142 71% 45%)
  warning:     '#F59E0B',   // hsl(38 92% 50%)
  destructive: '#EF4444',   // hsl(0 84% 60%)
  background:  '#0A0A0A',   // hsl(0 0% 4%)
  card:        '#111111',   // hsl(0 0% 7%)
  border:      '#1F1F1F',   // hsl(0 0% 12%)
  foreground:  '#FAFAFA',   // hsl(0 0% 98%)
  muted:       '#767676',   // hsl(240 4% 46%)
  secondary:   '#1E1E1E',
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

// Regime color mapping — same as web REGIME_META
export const regimeColor: Record<string, string> = {
  BULL_CONFIRMED:  colors.success,
  BULL_EARLY:      colors.success,
  BULL_WATCH:      colors.success,
  TRANSITION_UP:   colors.warning,
  SIDEWAYS_CHOPPY: colors.warning,
  BEAR_WATCH:      colors.destructive,
  BEAR_TRANSITION: colors.destructive,
  BEAR_CONFIRMED:  colors.destructive,
};
