import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

// ── Types ──

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonGroupProps {
  lines?: number;
  lastLineWidth?: string;
}

// ── Skeleton Component ──

export function Skeleton({ width = '100%', height = 16, borderRadius: br, style }: SkeletonProps) {
  const { colors, borderRadius } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br ?? borderRadius.md,
          backgroundColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ── Card Skeleton ──

export function CardSkeleton() {
  const { spacing, borderRadius, colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={[styles.cardContent, { marginLeft: spacing.sm }]}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <Skeleton width="100%" height={12} style={{ marginTop: spacing.sm }} />
      <Skeleton width="75%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

// ── Line Skeleton Group ──

export function SkeletonLines({ lines = 3, lastLineWidth = '60%' }: SkeletonGroupProps) {
  return (
    <View style={styles.lines}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          style={{ marginBottom: 10 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  lines: {},
});
