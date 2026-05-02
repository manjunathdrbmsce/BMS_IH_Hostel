import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { gateApi, type GatePass } from '@/api';
import type { GatePassApprovalStatusName } from '@/constants';
import { Card, GatePassApprovalStatusBadge, EmptyState, Skeleton } from '@/components';
import { formatDate, formatTime } from '@/utils';
import { useApi, usePaginatedApi } from '@/hooks';

export default function WardenGatePasses() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>('PENDING');

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<GatePass>(
    gateApi.listPasses,
    filter ? { approvalStatus: filter as GatePassApprovalStatusName } : {},
  );
  const updatePass = useApi(gateApi.updatePass);

  const filters = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'All', value: null },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  const handleApproval = (pass: GatePass, approvalStatus: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      approvalStatus === 'APPROVED' ? 'Approve pass' : 'Reject pass',
      `Are you sure you want to ${approvalStatus.toLowerCase()} this gate pass?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approvalStatus === 'APPROVED' ? 'Approve' : 'Reject',
          style: approvalStatus === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updatePass.execute(pass.id, { approvalStatus });
              refresh();
            } catch {
              Alert.alert('Error', 'Failed to update gate pass approval');
            }
          },
        },
      ],
    );
  };

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
                {item.student?.firstName} {item.student?.lastName}
              </Text>
              <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
                {formatDate(item.expectedOut)} · {formatTime(item.expectedOut)} - {formatTime(item.expectedIn)}
              </Text>
            </View>
            <GatePassApprovalStatusBadge status={item.approvalStatus} />
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
          {item.approvalStatus === 'PENDING' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleApproval(item, 'APPROVED')}
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                <Text style={styles.actionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApproval(item, 'REJECTED')}
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
        style={styles.filterList}
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
  filterList: { flexGrow: 0, maxHeight: 48 },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  passIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  reason: { fontSize: 13, lineHeight: 18 },
  destRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
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
