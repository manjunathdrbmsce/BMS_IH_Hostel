import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps, type StyleProp } from 'react-native';
import { useTheme } from '@/theme';

// ── Types ──

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ── Component ──

export function Card({ variant = 'elevated', padding = 'md', children, style, ...rest }: CardProps) {
  const { colors, spacing, borderRadius, shadows } = useTheme();

  const paddingMap = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  const variantStyles: Record<CardVariant, ViewStyle> = {
    elevated: {
      backgroundColor: colors.card,
      ...shadows.md,
    },
    outlined: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filled: {
      backgroundColor: colors.surfaceSecondary,
    },
  };

  return (
    <View
      style={[
        styles.base,
        { borderRadius: borderRadius.xl, padding: paddingMap[padding] },
        variantStyles[variant],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
