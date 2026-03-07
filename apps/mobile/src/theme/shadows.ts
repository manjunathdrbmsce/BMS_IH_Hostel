import { Platform, ViewStyle } from 'react-native';

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

const createShadow = (offsetY: number, radius: number, opacity: number, elevation: number): ShadowStyle => ({
  ...Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation },
  }),
});

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  sm: createShadow(1, 2, 0.05, 1),
  md: createShadow(2, 4, 0.08, 3),
  lg: createShadow(4, 8, 0.1, 6),
  xl: createShadow(8, 16, 0.12, 10),
  '2xl': createShadow(12, 24, 0.15, 15),
} as const;
