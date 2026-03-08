import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { messApi, type MealScan, type MealType } from '@/api';
import { Card, Badge, Skeleton, EmptyState } from '@/components';
import { usePaginatedApi } from '@/hooks';
import { formatRelative } from '@/utils';

const MEAL_ICONS: Record<MealType, { icon: string; color: string }> = {
  BREAKFAST: { icon: 'sunny-outline', color: '#F59E0B' },
  LUNCH: { icon: 'restaurant-outline', color: '#3B82F6' },
  SNACKS: { icon: 'cafe-outline', color: '#8B5CF6' },
  DINNER: { icon: 'moon-outline', color: '#6366F1' },
};

export default function MessHistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<MealType | null>(null);

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<MealScan>(
    messApi.getMyHistory,
    filter ? { mealType: filter } : {},
  );

  const filters: { label: string; value: MealType | null }[] = [
    { label: 'All', value: null },
    { label: 'Breakfast', value: 'BREAKFAST' },
    { label: 'Lunch', value: 'LUNCH' },
    { label: 'Snacks', value: 'SNACKS' },
    { label: 'Dinner', value: 'DINNER' },
  ];

  const renderItem = useCallback(
    ({ item, index: idx }: { item: MealScan; index: number }) => {
      const config = MEAL_ICONS[item.mealType] || MEAL_ICONS.LUNCH;
      return (
        <Animated.View entering={FadeInDown.delay(idx * 50).duration(350)}>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.mealIcon, { backgroundColor: config.color + '18' }]}>
                <Ionicons name={config.icon as any} size={20} color={config.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mealLabel, { color: colors.text }]}>
                  {item.mealType.charAt(0) + item.mealType.slice(1).toLowerCase()}
                </Text>
                <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>
                  {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(item.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: item.status === 'CANCELLED' ? colors.error : '#10B981' }]} />
            </View>
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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Meal History</Text>
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
              <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f.value ? '#FFF' : colors.textSecondary }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} width="100%" height={70} style={{ borderRadius: 16 }} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="time-outline" title="No Meals Recorded" description="Your scanned meals will appear here" />
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
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontSize: 15, fontWeight: '700' },
  dateLabel: { fontSize: 12, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
