import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi, type AttendanceRecord } from '@/api';
import { Card, AttendanceStatusBadge, EmptyState, Skeleton } from '@/components';
import { formatDate, formatTime } from '@/utils';
import { useApi } from '@/hooks';

export default function ParentAttendance() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const myAttendance = useApi<{ records: AttendanceRecord[]; stats: any }>(
    () => attendanceApi.my(),
    { immediate: true },
  );

  const items = myAttendance.data?.records ?? [];
  const loading = myAttendance.isLoading;
  const refreshing = false;
  const refresh = () => myAttendance.execute();

  const renderItem = useCallback(
    ({ item, index: idx }: { item: AttendanceRecord; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 50).duration(400)}>
        <Card variant="outlined" style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.dateBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.dateDay, { color: colors.primary }]}>
                {new Date(item.date).getDate()}
              </Text>
              <Text style={[styles.dateMonth, { color: colors.primary }]}>
                {new Date(item.date).toLocaleString('en', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {formatDate(item.date)}
              </Text>
              {item.firstIn && (
                <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
                  Marked at {formatTime(item.firstIn)}
                </Text>
              )}
            </View>
            <AttendanceStatusBadge status={item.status} />
          </View>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ward's Attendance</Text>
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={70} style={{ borderRadius: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="stats-chart-outline"
              title="No Records"
              description="No attendance records available yet."
            />
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
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBadge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 18, fontWeight: '800' },
  dateMonth: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
});
