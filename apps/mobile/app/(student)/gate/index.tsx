import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { gateApi, type GatePass } from '@/api';
import type { GatePassStatusName } from '@/constants';
import { Card, GatePassStatusBadge, Button, EmptyState, Skeleton } from '@/components';
import { formatDate, formatTime } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function GatePassIndex() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<GatePass>(
    gateApi.listPasses,
    filter ? { status: filter as GatePassStatusName } : {},
  );

  const filters = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Used', value: 'USED' },
  ];

  const renderItem = useCallback(
    ({ item, index: idx }: { item: GatePass; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.passIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="exit-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.reason || 'Gate Pass'}</Text>
              <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                {formatDate(item.expectedOut)}
              </Text>
            </View>
            <GatePassStatusBadge status={item.status} />
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>Expected Out</Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(item.expectedOut)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
            <View style={styles.timeBlock}>
              <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>Expected In</Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>{formatTime(item.expectedIn)}</Text>
            </View>
          </View>
          {item.destination && (
            <View style={styles.destRow}>
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.destText, { color: colors.textSecondary }]}>{item.destination}</Text>
            </View>
          )}
        </Card>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Gate Passes</Text>
          <View style={{ flex: 1 }} />
          <Button
            title="Request"
            size="sm"
            onPress={() => router.push('/(student)/gate/request')}
            icon={<Ionicons name="add" size={16} color="#FFF" />}
          />
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
            <Skeleton key={i} width="100%" height={130} style={{ borderRadius: 16 }} />
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
              icon="ticket-outline"
              title="No Gate Passes"
              description="You haven't requested any gate passes yet."
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  passIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardDate: { fontSize: 12, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8 },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  destText: { fontSize: 13 },
});
