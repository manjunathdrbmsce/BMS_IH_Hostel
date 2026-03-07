/**
 * BMS Hostel — Color Palette
 * Premium indigo-based palette with full light + dark mode support.
 */

export const palette = {
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo200: '#C7D2FE',
  indigo300: '#A5B4FC',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo800: '#3730A3',
  indigo900: '#312E81',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',

  emerald50: '#ECFDF5',
  emerald500: '#10B981',
  emerald600: '#059669',

  amber50: '#FFFBEB',
  amber500: '#F59E0B',
  amber600: '#D97706',

  rose50: '#FFF1F2',
  rose500: '#F43F5E',
  rose600: '#E11D48',

  sky50: '#F0F9FF',
  sky500: '#0EA5E9',
  sky600: '#0284C7',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const lightColors = {
  background: palette.white,
  backgroundSecondary: palette.slate50,
  backgroundTertiary: palette.slate100,

  surface: palette.white,
  surfaceElevated: palette.white,
  surfacePressed: palette.slate100,

  textPrimary: palette.slate900,
  textSecondary: palette.slate600,
  textTertiary: palette.slate400,
  textInverse: palette.white,
  textLink: palette.indigo600,

  primary: palette.indigo600,
  primaryLight: palette.indigo100,
  primaryDark: palette.indigo700,
  onPrimary: palette.white,

  success: palette.emerald600,
  successLight: palette.emerald50,
  warning: palette.amber600,
  warningLight: palette.amber50,
  error: palette.rose600,
  errorLight: palette.rose50,
  info: palette.sky600,
  infoLight: palette.sky50,

  border: palette.slate200,
  borderFocused: palette.indigo500,

  statusPresent: palette.emerald500,
  statusAbsent: palette.rose500,
  statusLate: palette.amber500,
  statusLeave: palette.sky500,
  statusPending: palette.amber500,
  statusApproved: palette.emerald500,
  statusRejected: palette.rose500,

  skeleton: palette.slate200,
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  tabBarBackground: palette.white,
  tabBarBorder: palette.slate200,
  tabBarActive: palette.indigo600,
  tabBarInactive: palette.slate400,

  // Convenience aliases used across screens
  text: palette.slate900,
  card: palette.white,
  cardAlt: palette.slate50,
  surfaceSecondary: palette.slate100,
} as const;

export const darkColors: ThemeColors = {
  background: palette.slate950,
  backgroundSecondary: palette.slate900,
  backgroundTertiary: palette.slate800,

  surface: palette.slate900,
  surfaceElevated: palette.slate800,
  surfacePressed: palette.slate700,

  textPrimary: palette.slate50,
  textSecondary: palette.slate400,
  textTertiary: palette.slate500,
  textInverse: palette.slate900,
  textLink: palette.indigo400,

  primary: palette.indigo500,
  primaryLight: palette.indigo900,
  primaryDark: palette.indigo400,
  onPrimary: palette.white,

  success: palette.emerald500,
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: palette.amber500,
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: palette.rose500,
  errorLight: 'rgba(244, 63, 94, 0.15)',
  info: palette.sky500,
  infoLight: 'rgba(14, 165, 233, 0.15)',

  border: palette.slate700,
  borderFocused: palette.indigo400,

  statusPresent: palette.emerald500,
  statusAbsent: palette.rose500,
  statusLate: palette.amber500,
  statusLeave: palette.sky500,
  statusPending: palette.amber500,
  statusApproved: palette.emerald500,
  statusRejected: palette.rose500,

  skeleton: palette.slate700,
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  tabBarBackground: palette.slate900,
  tabBarBorder: palette.slate800,
  tabBarActive: palette.indigo400,
  tabBarInactive: palette.slate500,

  // Convenience aliases used across screens
  text: palette.slate50,
  card: palette.slate900,
  cardAlt: palette.slate800,
  surfaceSecondary: palette.slate800,
};

export type ThemeColors = { [K in keyof typeof lightColors]: string };
