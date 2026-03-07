import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { gateApi, type GatePass } from '@/api';
import type { GatePassStatusName } from '@/constants';
import { Card, GatePassStatusBadge, EmptyState, Skeleton, Badge } from '@/components';
import { formatDate, formatTime } from '@/utils';
import { usePaginatedApi, useApi } from '@/hooks';

export default function SecurityPasses() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<string>('APPROVED');

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<GatePass>(
    gateApi.listPasses,
    { status: filter as GatePassStatusName },
  );

  const updatePass = useApi(gateApi.updatePass);

  const handleVerify = async (pass: GatePass, action: 'USED' | 'REJECTED') => {
    const actionLabel = action === 'USED' ? 'mark as used' : 'reject';
    Alert.alert(
      'Confirm',
      `Are you sure you want to ${actionLabel} this gate pass?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'USED' ? 'Verify' : 'Reject',
          style: action === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updatePass.execute(pass.id, { status: action });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refresh();
            } catch {
              Alert.alert('Error', 'Failed to update gate pass');
            }
          },
        },
      ],
    );
  };

  const filters = [
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Used', value: 'USED' },
    { label: 'All', value: '' },
  ];

  const renderItem = useCallback(
    ({ item, index: idx }: { item: GatePass; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>
                {item.student?.user?.firstName} {item.student?.user?.lastName}
              </Text>
              <Text style={[styles.rollNo, { color: colors.textSecondary }]}>
                {item.student?.user?.usn}
              </Text>
            </View>
            <GatePassStatusBadge status={item.status} />
          </View>

          <View style={[styles.detailRow, { borderTopColor: colors.border }]}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>
                {formatDate(item.expectedOut)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>
                {formatTime(item.expectedOut)} - {formatTime(item.expectedIn)}
              </Text>
            </View>
          </View>

          {item.destination && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>{item.destination}</Text>
            </View>
          )}

          {item.reason && (
            <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.reason}
            </Text>
          )}

          {item.status === 'ACTIVE' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleVerify(item, 'USED')}
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                <Text style={styles.actionText}>Verify & Use</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleVerify(item, 'REJECTED')}
                style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
              >
                <Ionicons name="close-circle" size={16} color="#FFF" />
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </Animated.View>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gate Passes</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={(f) => f.value}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="ticket-outline" title="No Passes" description="No gate passes to show." />
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
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700' },
  rollNo: { fontSize: 12, marginTop: 2 },
  detailRow: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  detailItem: { flexDirection: 'row', alignItems: 'center' },
  reason: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
