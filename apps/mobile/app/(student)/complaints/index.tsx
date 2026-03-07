import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { complaintsApi, type Complaint } from '@/api';
import type { ComplaintStatusName } from '@/constants';
import { Card, ComplaintStatusBadge, Button, EmptyState, Skeleton, SkeletonLines } from '@/components';
import { formatRelative } from '@/utils';
import { usePaginatedApi } from '@/hooks';

const CATEGORY_ICONS: Record<string, string> = {
  MAINTENANCE: 'build-outline',
  CLEANLINESS: 'sparkles-outline',
  FOOD: 'restaurant-outline',
  SECURITY: 'shield-outline',
  NOISE: 'volume-high-outline',
  RAGGING: 'alert-circle-outline',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

export default function ComplaintsIndex() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<Complaint>(
    complaintsApi.list,
    filter ? { status: filter as ComplaintStatusName } : {},
  );

  const filters = [
    { label: 'All', value: null },
    { label: 'Open', value: 'OPEN' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Resolved', value: 'RESOLVED' },
  ];

  const renderItem = useCallback(
    ({ item, index: idx }: { item: Complaint; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons
                  name={(CATEGORY_ICONS[item.category] || 'ellipsis-horizontal-circle-outline') as any}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={[styles.cardCategory, { color: colors.textTertiary }]}>
                  {item.category.replace('_', ' ')} · {formatRelative(item.createdAt)}
                </Text>
              </View>
              <ComplaintStatusBadge status={item.status} />
            </View>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
            {item.priority === 'HIGH' && (
              <View style={[styles.priorityBadge, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="flame" size={12} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
                  High Priority
                </Text>
              </View>
            )}
          </Card>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Complaints</Text>
          <View style={{ flex: 1 }} />
          <Button title="New" size="sm" onPress={() => router.push('/(student)/complaints/create')} icon={<Ionicons name="add" size={16} color="#FFF" />} />
        </View>

        {/* Filter Chips */}
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

      {/* List */}
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
              icon="chatbubble-ellipses-outline"
              title="No Complaints"
              description="You haven't filed any complaints yet."
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
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  categoryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardCategory: { fontSize: 12, marginTop: 2 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
});
