import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { attendanceApi, leaveApi, noticesApi, notificationsApi } from '@/api';
import { Avatar, Card, StatCard, CardSkeleton, Badge } from '@/components';
import { formatDate } from '@/utils';

export default function StudentHome() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    attendanceToday: string;
    attendancePct: number;
    pendingLeaves: number;
    unreadNotices: number;
    unreadNotifications: number;
  }>({
    attendanceToday: 'UNKNOWN',
    attendancePct: 0,
    pendingLeaves: 0,
    unreadNotices: 0,
    unreadNotifications: 0,
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const [attendanceRes, leaveRes, notifRes] = await Promise.allSettled([
        attendanceApi.my(),
        leaveApi.list({ status: 'PENDING' as any, limit: 1 }),
        notificationsApi.unreadCount(),
      ]);

      const attendance =
        attendanceRes.status === 'fulfilled' ? attendanceRes.value.data.data : null;
      const leaves =
        leaveRes.status === 'fulfilled' ? leaveRes.value.data : null;
      const notifs =
        notifRes.status === 'fulfilled' ? notifRes.value.data.data : null;

      const todayRecord = attendance?.records?.find(
        (r: any) => r.date === new Date().toISOString().split('T')[0],
      );

      setStats({
        attendanceToday: todayRecord?.status ?? 'UNKNOWN',
        attendancePct: attendance?.stats?.percentage ?? 0,
        pendingLeaves: (leaves as any)?.meta?.total ?? 0,
        unreadNotices: 0,
        unreadNotifications: notifs?.count ?? 0,
      });
    } catch {
      // Silently fail — dashboard is non-critical
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchDashboard();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const quickActions = [
    { icon: 'qr-code' as const, label: 'Scan QR', color: '#4F46E5', route: '/(student)/attendance/scan' },
    { icon: 'airplane' as const, label: 'Apply Leave', color: '#059669', route: '/(student)/leave/apply' },
    { icon: 'chatbubble-ellipses' as const, label: 'Complaint', color: '#D97706', route: '/(student)/complaints/create' },
    { icon: 'document-text' as const, label: 'Notices', color: '#0891B2', route: '/(student)/notices' },
  ];

  const attendanceColor: Record<string, string> = {
    PRESENT: colors.success,
    ABSENT: colors.error,
    ON_LEAVE: colors.info,
    LATE: colors.warning,
    UNKNOWN: colors.textTertiary,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>{user?.firstName ?? 'Student'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/(student)/notifications' as any)} style={styles.notifButton}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              {stats.unreadNotifications > 0 && (
                <View style={[styles.notifDot, { backgroundColor: colors.error }]} />
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/(student)/profile' as any)}>
              <Avatar name={fullName} size={40} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action, i) => (
              <Pressable
                key={action.label}
                style={[styles.quickAction, { backgroundColor: colors.card }]}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}14` }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Stats Row */}
        {loading ? (
          <View style={{ marginTop: spacing.md }}>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            {/* Today's Attendance */}
            <Card variant="elevated" style={[styles.attendanceCard, { marginTop: spacing.md }]}>
              <View style={styles.attendanceRow}>
                <View>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                    Today's Attendance
                  </Text>
                  <Text
                    style={[
                      styles.attendanceStatus,
                      { color: attendanceColor[stats.attendanceToday] ?? colors.textTertiary },
                    ]}
                  >
                    {stats.attendanceToday.replace('_', ' ')}
                  </Text>
                </View>
                <View style={styles.attendancePct}>
                  <Text style={[styles.pctValue, { color: colors.primary }]}>
                    {Math.round(stats.attendancePct)}%
                  </Text>
                  <Text style={[styles.pctLabel, { color: colors.textTertiary }]}>Overall</Text>
                </View>
              </View>
            </Card>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard
                title="Pending Leaves"
                value={stats.pendingLeaves}
                icon="time-outline"
                color="#D97706"
                style={styles.statHalf}
              />
              <StatCard
                title="Attendance"
                value={`${Math.round(stats.attendancePct)}%`}
                icon="checkmark-circle-outline"
                color="#059669"
                style={styles.statHalf}
              />
            </View>
          </Animated.View>
        )}

        {/* Menu List */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginTop: spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Services</Text>
          {[
            { icon: 'calendar-outline', label: 'Attendance History', route: '/(student)/attendance' },
            { icon: 'airplane-outline', label: 'Leave Requests', route: '/(student)/leave' },
            { icon: 'shield-checkmark-outline', label: 'Gate Passes', route: '/(student)/gate' },
            { icon: 'chatbubble-ellipses-outline', label: 'Complaints', route: '/(student)/complaints' },
            { icon: 'document-text-outline', label: 'Notices', route: '/(student)/notices' },
            { icon: 'warning-outline', label: 'Violations', route: '/(student)/violations' },
          ].map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 14, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  notifButton: { position: 'relative', padding: 2 },
  notifDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  attendanceCard: { padding: 20 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  attendanceStatus: { fontSize: 20, fontWeight: '800', textTransform: 'capitalize' },
  attendancePct: { alignItems: 'center' },
  pctValue: { fontSize: 28, fontWeight: '800' },
  pctLabel: { fontSize: 11, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statHalf: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 0.5,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
