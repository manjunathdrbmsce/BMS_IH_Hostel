import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { leaveApi, type LeaveRequest } from '@/api';
import type { LeaveStatusName } from '@/constants';
import { Card, LeaveStatusBadge, EmptyState, Skeleton } from '@/components';
import { formatDateRange, formatRelative } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function ParentLeaveIndex() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<LeaveRequest>(
    leaveApi.list,
    filter ? { status: filter as LeaveStatusName } : undefined,
  );

  const filters = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'PARENT_APPROVED' },
  ];

  const renderItem = useCallback(
    ({ item, index: idx }: { item: LeaveRequest; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/(parent)/leave/${item.id}`)}
        >
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.type} Leave</Text>
                <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                  {formatDateRange(item.fromDate, item.toDate)}
                </Text>
              </View>
              <LeaveStatusBadge status={item.status} />
            </View>
            <Text style={[styles.cardReason, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.reason}
            </Text>
            {item.status === 'PENDING' && (
              <View style={[styles.actionHint, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="time-outline" size={14} color={colors.warning} />
                <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                  Awaiting your approval
                </Text>
              </View>
            )}
          </Card>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors, router],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Leave Requests</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(f) => String(f.value)}
          contentContainerStyle={{ gap: 8, paddingTop: 12 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setFilter(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f.value ? colors.primary : colors.card,
                  borderColor: filter === f.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: filter === f.value ? '#FFF' : colors.textSecondary,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={120} style={{ borderRadius: 16 }} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No Leave Requests"
              description="Your ward hasn't submitted any leave requests yet."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardDate: { fontSize: 12, marginTop: 2 },
  cardReason: { fontSize: 13, lineHeight: 18 },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});
