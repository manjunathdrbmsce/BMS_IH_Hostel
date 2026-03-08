import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { dashboardApi, notificationsApi, type DashboardStats } from '@/api';
import { Avatar, Card, StatCard, Skeleton } from '@/components';

export default function ParentHome() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, notifRes] = await Promise.all([
        dashboardApi.stats(),
        notificationsApi.unreadCount(),
      ]);
      setStats(statsRes.data.data);
      setUnreadCount(notifRes.data.data?.count || 0);
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const quickActions = [
    {
      icon: 'calendar-outline',
      label: 'Leave Requests',
      color: '#6366F1',
      onPress: () => router.push('/(parent)/leave'),
    },
    {
      icon: 'stats-chart-outline',
      label: 'Attendance',
      color: '#10B981',
      onPress: () => router.push('/(parent)/attendance'),
    },
    {
      icon: 'megaphone-outline',
      label: 'Notices',
      color: '#3B82F6',
      onPress: () => router.push('/(parent)/notices'),
    },
    {
      icon: 'restaurant-outline',
      label: 'Mess Menu',
      color: '#F59E0B',
      onPress: () => router.push('/(parent)/mess'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      color: '#8B5CF6',
      onPress: () => router.push('/(parent)/notifications'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: colors.text }]}>
              {user?.firstName} {user?.lastName}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(parent)/notifications')} style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={26} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Ward Info */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Card variant="elevated" style={styles.wardCard}>
            <Avatar name="Ward" size={48} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.wardTitle, { color: colors.text }]}>Your Ward</Text>
              <Text style={[styles.wardSub, { color: colors.textSecondary }]}>
                Monitoring attendance and leave status
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Card>
        </Animated.View>

        {/* Stats */}
        {loading ? (
          <View style={styles.statsRow}>
            {[1, 2].map((i) => (
              <Skeleton key={i} width="48%" height={100} style={{ borderRadius: 16 }} />
            ))}
          </View>
        ) : stats ? (
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.statsRow}>
            <StatCard
              title="Attendance"
              value={`${stats.attendancePercentage || stats.occupancyRate || 0}%`}
              icon="stats-chart"
              color="#10B981"
              style={{ flex: 1 }}
            />
            <StatCard
              title="Pending Leaves"
              value={String(stats.pendingLeaves || 0)}
              icon="time-outline"
              color="#F59E0B"
              style={{ flex: 1 }}
            />
          </Animated.View>
        ) : null}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  wardCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16 },
  wardTitle: { fontSize: 16, fontWeight: '700' },
  wardSub: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});
