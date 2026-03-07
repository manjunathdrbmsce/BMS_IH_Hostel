/**
 * BMS Hostel — Typography Scale
 * System fonts with Inter as preferred (loaded via expo-font).
 */

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  systemRegular: 'System',
  systemBold: 'System',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const lineHeight = {
  xs: 16,
  sm: 18,
  base: 22,
  md: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 38,
  '4xl': 44,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const textStyles = {
  displayLg: { fontSize: fontSize['4xl'], lineHeight: lineHeight['4xl'], fontWeight: fontWeight.bold },
  displayMd: { fontSize: fontSize['3xl'], lineHeight: lineHeight['3xl'], fontWeight: fontWeight.bold },
  heading: { fontSize: fontSize['2xl'], lineHeight: lineHeight['2xl'], fontWeight: fontWeight.bold },
  title: { fontSize: fontSize.xl, lineHeight: lineHeight.xl, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: fontSize.lg, lineHeight: lineHeight.lg, fontWeight: fontWeight.semibold },
  bodyLg: { fontSize: fontSize.md, lineHeight: lineHeight.md, fontWeight: fontWeight.regular },
  body: { fontSize: fontSize.base, lineHeight: lineHeight.base, fontWeight: fontWeight.regular },
  bodySm: { fontSize: fontSize.sm, lineHeight: lineHeight.sm, fontWeight: fontWeight.regular },
  caption: { fontSize: fontSize.xs, lineHeight: lineHeight.xs, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.sm, lineHeight: lineHeight.sm, fontWeight: fontWeight.medium },
  button: { fontSize: fontSize.base, lineHeight: lineHeight.base, fontWeight: fontWeight.semibold },
  buttonSm: { fontSize: fontSize.sm, lineHeight: lineHeight.sm, fontWeight: fontWeight.semibold },
} as const;
