import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi, type AttendanceRecord, type AttendanceStats } from '@/api';
import { Card, Badge, EmptyState, Skeleton, Button } from '@/components';
import { formatDate, formatTime } from '@/utils';

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#059669',
  ABSENT: '#DC2626',
  ON_LEAVE: '#2563EB',
  LATE: '#D97706',
  UNKNOWN: '#94A3B8',
};

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  ON_LEAVE: 'info',
  LATE: 'warning',
  UNKNOWN: 'default',
};

export default function AttendanceHistory() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await attendanceApi.my();
      setRecords(data.data.records ?? []);
      setStats(data.data.stats ?? null);
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchData();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Attendance</Text>
        <Button
          title="Scan QR"
          size="sm"
          icon={<Ionicons name="qr-code" size={16} color="#FFF" style={{ marginRight: 4 }} />}
          onPress={() => router.push('/(student)/attendance/scan' as any)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Card variant="elevated" style={styles.statsCard}>
              <Text style={[styles.statsTitle, { color: colors.text }]}>Overview</Text>
              <View style={styles.statsRow}>
                {[
                  { label: 'Present', value: stats.present, color: '#059669' },
                  { label: 'Absent', value: stats.absent, color: '#DC2626' },
                  { label: 'Late', value: stats.late, color: '#D97706' },
                  { label: 'Leave', value: stats.onLeave, color: '#2563EB' },
                ].map((s) => (
                  <View key={s.label} style={styles.statItem}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.pctBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.pctFill,
                    {
                      width: `${Math.min(stats.percentage, 100)}%`,
                      backgroundColor: stats.percentage >= 75 ? '#059669' : stats.percentage >= 50 ? '#D97706' : '#DC2626',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.pctText, { color: colors.textSecondary }]}>
                {Math.round(stats.percentage)}% attendance rate
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* Records */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={64} style={{ marginBottom: 8, borderRadius: 14 }} />
            ))
          ) : records.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No Records Yet"
              description="Your attendance records will appear here once sessions begin."
            />
          ) : (
            records.map((record) => (
              <Card key={record.id} variant="outlined" style={styles.recordCard}>
                <View style={styles.recordRow}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[record.status] ?? '#94A3B8' }]} />
                  <View style={styles.recordInfo}>
                    <Text style={[styles.recordDate, { color: colors.text }]}>{formatDate(record.date)}</Text>
                    <Text style={[styles.recordTime, { color: colors.textTertiary }]}>
                      {record.firstIn ? `In: ${formatTime(record.firstIn)}` : 'No check-in'}{' '}
                      {record.lastOut ? ` · Out: ${formatTime(record.lastOut)}` : ''}
                    </Text>
                  </View>
                  <Badge
                    label={record.status.replace('_', ' ')}
                    variant={STATUS_VARIANT[record.status] ?? 'default'}
                    size="sm"
                  />
                </View>
              </Card>
            ))
          )}
        </Animated.View>
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  statsCard: { padding: 20, marginBottom: 20 },
  statsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  pctBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  pctFill: { height: '100%', borderRadius: 3 },
  pctText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
  recordCard: { padding: 14, marginBottom: 8 },
  recordRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recordInfo: { flex: 1 },
  recordDate: { fontSize: 15, fontWeight: '600' },
  recordTime: { fontSize: 12, marginTop: 2 },
});
