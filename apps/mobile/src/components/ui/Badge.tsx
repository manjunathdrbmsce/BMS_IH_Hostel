import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

// ── Types ──

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
}

// ── Component ──

export function Badge({ label, variant = 'default', size = 'sm', dot = false, style }: BadgeProps) {
  const { colors, borderRadius, spacing } = useTheme();

  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
    default: { bg: colors.surfaceSecondary, text: colors.textSecondary },
    success: { bg: `${colors.success}18`, text: colors.success },
    warning: { bg: `${colors.warning}18`, text: colors.warning },
    error: { bg: `${colors.error}18`, text: colors.error },
    info: { bg: `${colors.info}18`, text: colors.info },
    outline: { bg: 'transparent', text: colors.textSecondary, border: colors.border },
  };

  const sizeStyles: Record<BadgeSize, { px: number; py: number; fontSize: number }> = {
    sm: { px: spacing.xs, py: 2, fontSize: 11 },
    md: { px: spacing.sm, py: spacing.xs, fontSize: 13 },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderRadius: borderRadius.full,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: v.text }]} />}
      <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
});
