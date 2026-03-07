import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi, type AttendanceSession } from '@/api';
import { Card, Badge, Button, EmptyState, Skeleton } from '@/components';
import { formatDate, formatTime } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function RollCallIndex() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<AttendanceSession>(
    attendanceApi.activeSessions,
  );

  const renderItem = useCallback(
    ({ item, index: idx }: { item: AttendanceSession; index: number }) => {
      const isActive = item.status === 'ACTIVE';
      return (
        <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/(warden)/roll-call/${item.id}`)}
          >
            <Card variant="elevated" style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.sessionIcon,
                    { backgroundColor: isActive ? '#10B98118' : colors.cardAlt || colors.card },
                  ]}
                >
                  <Ionicons
                    name={isActive ? 'radio-outline' : 'checkmark-done-outline'}
                    size={20}
                    color={isActive ? '#10B981' : colors.textTertiary}
                  />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {item.title || item.name || 'Roll Call Session'}
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
                    {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                  </Text>
                </View>
                <Badge
                  label={isActive ? 'Live' : 'Ended'}
                  variant={isActive ? 'success' : 'default'}
                  size="sm"
                />
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.presentCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Present</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.absentCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Absent</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.totalStudents || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, router],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Roll Call</Text>
        <View style={{ flex: 1 }} />
        <Button
          title="New Session"
          size="sm"
          onPress={() => router.push('/(warden)/roll-call/create')}
          icon={<Ionicons name="add" size={16} color="#FFF" />}
        />
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={140} style={{ borderRadius: 16 }} />
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
            <EmptyState
              icon="qr-code-outline"
              title="No Sessions"
              description="Start a new roll call session to take attendance."
              actionLabel="New Session"
              onAction={() => router.push('/(warden)/roll-call/create')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 0, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sessionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 30 },
});
