export const Colors = {
  background: '#0A0A0F',
  surface: '#14141F',
  surfaceElevated: '#1E1E2E',
  border: '#2A2A3E',
  primary: '#7C4DFF',
  primaryLight: '#B388FF',
  accent: '#FF6D00',
  text: '#E8E8F0',
  textMuted: '#8888A0',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.text },
  h2: { fontSize: 22, fontWeight: '600' as const, color: Colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 16, color: Colors.text },
  caption: { fontSize: 14, color: Colors.textMuted },
  small: { fontSize: 12, color: Colors.textMuted },
} as const
