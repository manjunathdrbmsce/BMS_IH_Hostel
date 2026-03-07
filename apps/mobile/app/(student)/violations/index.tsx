import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { violationsApi, type Violation } from '@/api';
import { Card, Badge, EmptyState, Skeleton } from '@/components';
import { formatRelative } from '@/utils';
import { usePaginatedApi } from '@/hooks';

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  LATE_ENTRY: { icon: 'time-outline', color: '#F59E0B', label: 'Late Entry' },
  UNAUTHORIZED_ABSENCE: { icon: 'close-circle-outline', color: '#EF4444', label: 'Unauthorized Absence' },
  NOISE: { icon: 'volume-high-outline', color: '#8B5CF6', label: 'Noise Violation' },
  PROPERTY_DAMAGE: { icon: 'hammer-outline', color: '#DC2626', label: 'Property Damage' },
  SUBSTANCE_USE: { icon: 'flask-outline', color: '#B91C1C', label: 'Substance Use' },
  RAGGING: { icon: 'alert-circle-outline', color: '#991B1B', label: 'Ragging' },
  OTHER: { icon: 'ellipsis-horizontal-outline', color: '#6B7280', label: 'Other' },
};

export default function ViolationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<Violation>(
    violationsApi.my,
  );

  const renderItem = useCallback(
    ({ item, index: idx }: { item: Violation; index: number }) => {
      const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.OTHER;
      return (
        <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: config.color + '18' }]}>
                <Ionicons name={config.icon as any} size={20} color={config.color} />
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{config.label}</Text>
                <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                  {formatRelative(item.createdAt)}
                </Text>
              </View>
              <Badge
                label={item.resolvedAt ? 'Resolved' : 'Active'}
                variant={item.resolvedAt ? 'success' : 'error'}
                size="sm"
              />
            </View>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
              {item.description}
            </Text>
            {item.notes && (
              <View style={[styles.penaltyBox, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="warning-outline" size={14} color={colors.warning} />
                <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                  Note: {item.notes}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>
      );
    },
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Violations</Text>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={110} style={{ borderRadius: 16 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title="No Violations"
              description="You have a clean record. Keep it up!"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  penaltyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});
