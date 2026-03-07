import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { gateApi, type GatePass } from '@/api';
import type { GatePassStatusName } from '@/constants';
import { Card, GatePassStatusBadge, EmptyState, Skeleton } from '@/components';
import { formatDate, formatTime } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function WardenGatePasses() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>('PENDING');

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<GatePass>(
    gateApi.listPasses,
    filter ? { status: filter as GatePassStatusName } : {},
  );

  const filters = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'All', value: null },
    { label: 'Approved', value: 'APPROVED' },
  ];

  const renderItem = useCallback(
    ({ item, index: idx }: { item: GatePass; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.passIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="exit-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.cardMeta}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.student?.user?.firstName} {item.student?.user?.lastName}
              </Text>
              <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
                {formatDate(item.expectedOut)} · {formatTime(item.expectedOut)} - {formatTime(item.expectedIn)}
              </Text>
            </View>
            <GatePassStatusBadge status={item.status} />
          </View>
          {item.reason && (
            <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.reason}
            </Text>
          )}
          {item.destination && (
            <View style={styles.destRow}>
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>{item.destination}</Text>
            </View>
          )}
        </Card>
      </Animated.View>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gate Passes</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={(f) => String(f.value)}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}
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

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={100} style={{ borderRadius: 16 }} />
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
            <EmptyState icon="ticket-outline" title="No Gate Passes" description="No gate pass requests to review." />
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
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  passIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  reason: { fontSize: 13, lineHeight: 18 },
  destRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
});
