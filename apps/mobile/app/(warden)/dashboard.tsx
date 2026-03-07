import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import {
  dashboardApi,
  leaveApi,
  complaintsApi,
  attendanceApi,
  notificationsApi,
  type DashboardStats,
} from '@/api';
import { Avatar, Card, StatCard, Skeleton } from '@/components';

export default function WardenDashboard() {
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

  const statCards = stats
    ? [
        { title: 'Total Students', value: String(stats.totalStudents || 0), icon: 'people', color: '#6366F1' },
        { title: 'Present Today', value: String(stats.presentToday || 0), icon: 'checkmark-circle', color: '#10B981' },
        { title: 'Pending Leaves', value: String(stats.pendingLeaves || 0), icon: 'time-outline', color: '#F59E0B' },
        { title: 'Open Complaints', value: String(stats.openComplaints || 0), icon: 'chatbubble-outline', color: '#EF4444' },
      ]
    : [];

  const quickActions = [
    { icon: 'qr-code-outline', label: 'Start Roll Call', color: '#6366F1', route: '/(warden)/roll-call/create' },
    { icon: 'calendar-outline', label: 'Leave Requests', color: '#10B981', route: '/(warden)/leave' },
    { icon: 'people-outline', label: 'Students', color: '#3B82F6', route: '/(warden)/students' },
    { icon: 'phone-portrait-outline', label: 'Device Requests', color: '#8B5CF6', route: '/(warden)/devices' },
    { icon: 'exit-outline', label: 'Gate Passes', color: '#F59E0B', route: '/(warden)/gate' },
    { icon: 'person-outline', label: 'Profile', color: '#6B7280', route: '/(warden)/profile' },
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
          <TouchableOpacity onPress={() => router.push('/(warden)/notifications')} style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={26} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Grid */}
        {loading ? (
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="48%" height={100} style={{ borderRadius: 16 }} />
            ))}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.statsGrid}>
            {statCards.map((s) => (
              <StatCard
                key={s.title}
                title={s.title}
                value={s.value}
                icon={s.icon as any}
                color={s.color}
                style={{ width: '48%' }}
              />
            ))}
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(action.route as any)}
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
    position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444',
    borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '30%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
