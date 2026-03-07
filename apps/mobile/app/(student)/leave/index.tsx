import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { leaveApi, type LeaveRequest } from '@/api';
import { Card, LeaveStatusBadge, EmptyState, Skeleton, Badge, Button } from '@/components';
import { formatDateRange, smartDate } from '@/utils';
import { type LeaveStatusName } from '@/constants';

const TABS: { key: LeaveStatusName | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'WARDEN_APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function LeaveList() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<LeaveStatusName | 'ALL'>('ALL');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaves = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (activeTab !== 'ALL') params.status = activeTab;
      const { data } = await leaveApi.list(params);
      setLeaves(data.data ?? []);
    } catch {
      //
    }
  }, [activeTab]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLeaves();
      setLoading(false);
    })();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaves();
    setRefreshing(false);
  };

  const LEAVE_TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
    HOME: 'home-outline',
    MEDICAL: 'medkit-outline',
    EMERGENCY: 'warning-outline',
    OTHER: 'document-text-outline',
  };

  const renderItem = ({ item }: { item: LeaveRequest }) => (
    <Pressable onPress={() => router.push(`/(student)/leave/${item.id}` as any)}>
      <Card variant="outlined" style={styles.leaveCard}>
        <View style={styles.cardRow}>
          <View style={[styles.typeIcon, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name={LEAVE_TYPE_ICON[item.type] ?? 'document-outline'} size={20} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.leaveType, { color: colors.text }]}>{item.type} Leave</Text>
            <Text style={[styles.leaveDates, { color: colors.textSecondary }]}>
              {formatDateRange(item.fromDate, item.toDate)}
            </Text>
          </View>
          <LeaveStatusBadge status={item.status} />
        </View>
        <Text style={[styles.reason, { color: colors.textTertiary }]} numberOfLines={2}>
          {item.reason}
        </Text>
        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
          Applied {smartDate(item.createdAt)}
        </Text>
      </Card>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Leave Requests</Text>
        <Button
          title="Apply"
          size="sm"
          icon={<Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 2 }} />}
          onPress={() => router.push('/(student)/leave/apply' as any)}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab.key ? colors.primary : colors.surfaceSecondary,
                borderColor: activeTab === tab.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#FFF' : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={100} style={{ marginBottom: 10, borderRadius: 14 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="airplane-outline"
              title="No Leave Requests"
              description="You haven't applied for any leave yet."
              actionLabel="Apply Now"
              onAction={() => router.push('/(student)/leave/apply' as any)}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  skeletonContainer: { paddingHorizontal: 20, paddingTop: 8 },
  leaveCard: { padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  leaveType: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  leaveDates: { fontSize: 12, marginTop: 2 },
  reason: { fontSize: 13, lineHeight: 18 },
  timestamp: { fontSize: 11, marginTop: 6 },
});
