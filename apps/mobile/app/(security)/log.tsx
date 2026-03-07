import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { gateApi, type GateEntry } from '@/api';
import { Card, EmptyState, Skeleton, Badge } from '@/components';
import { formatTime, formatDate } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function SecurityLog() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<GateEntry>(
    gateApi.listEntries,
  );

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const renderItem = useCallback(
    ({ item, index: idx }: { item: GateEntry; index: number }) => {
      const isOut = item.type === 'OUT';
      const dirColor = isOut ? '#F59E0B' : '#10B981';

      return (
        <Animated.View entering={FadeInDown.delay(idx * 40).duration(350)}>
          <View style={styles.logItem}>
            <View style={[styles.dirDot, { backgroundColor: dirColor + '20' }]}>
              <Ionicons
                name={isOut ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={dirColor}
              />
            </View>

            <View style={styles.logBody}>
              <View style={styles.logRow}>
                <Text style={[styles.logName, { color: colors.text }]}>
                  {item.student?.user?.firstName} {item.student?.user?.lastName}
                </Text>
                <Badge variant={isOut ? 'warning' : 'success'} size="sm" label={isOut ? 'OUT' : 'IN'} />
              </View>
              {item.student?.user?.usn && (
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>{item.student.user.usn}</Text>
              )}
              {item.notes && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{item.notes}</Text>
              )}
            </View>

            <Text style={[styles.time, { color: colors.textTertiary }]}>{formatTime(item.createdAt)}</Text>
          </View>
        </Animated.View>
      );
    },
    [colors],
  );

  // Stats row
  const inCount = items.filter((e) => e.type === 'IN').length;
  const outCount = items.filter((e) => e.type === 'OUT').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Entry Log</Text>
        <Text style={[styles.headerDate, { color: colors.textSecondary }]}>{todayStr}</Text>
      </View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.statsRow}>
          <Card variant="elevated" style={[styles.statCard, { borderLeftColor: '#10B981', borderLeftWidth: 3 }]}>
            <Ionicons name="arrow-down-circle" size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.text }]}>{inCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>In</Text>
          </Card>
          <Card variant="elevated" style={[styles.statCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 3 }]}>
            <Ionicons name="arrow-up-circle" size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>{outCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Out</Text>
          </Card>
          <Card variant="elevated" style={[styles.statCard, { borderLeftColor: colors.primary, borderLeftWidth: 3 }]}>
            <Ionicons name="swap-vertical" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{items.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
          </Card>
        </View>
      </Animated.View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={60} style={{ borderRadius: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 50 }} />
          )}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="list-outline" title="No Entries" description="No gate entries logged yet today." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerDate: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 16 },
  statCard: { flex: 1, flexDirection: 'column', alignItems: 'center', padding: 12, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  dirDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logBody: { flex: 1 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logName: { fontSize: 14, fontWeight: '600' },
  time: { fontSize: 12, fontWeight: '500' },
});
