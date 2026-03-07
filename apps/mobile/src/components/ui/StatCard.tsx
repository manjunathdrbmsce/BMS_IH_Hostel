import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Card } from './Card';

// ── Types ──

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  /** Alias for color */
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
  trend?: { value: number; isUp: boolean };
  style?: ViewStyle;
}

// ── Component ──

export function StatCard({ title, value, icon, color, iconColor: iconColorProp, iconBg: _iconBg, subtitle, trend, style }: StatCardProps) {
  const { colors, spacing } = useTheme();
  const iconColor = iconColorProp ?? color ?? colors.primary;

  return (
    <Card variant="elevated" style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}14` }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        {trend && (
          <View style={[styles.trend, { backgroundColor: trend.isUp ? `${colors.success}14` : `${colors.error}14` }]}>
            <Ionicons
              name={trend.isUp ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend.isUp ? colors.success : colors.error}
            />
            <Text style={[styles.trendText, { color: trend.isUp ? colors.success : colors.error }]}>
              {trend.value}%
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    minWidth: 150,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
