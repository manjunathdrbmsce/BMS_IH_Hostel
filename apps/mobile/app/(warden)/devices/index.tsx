import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { attendanceApi, type DeviceChangeRequest } from '@/api';
import { Card, Badge, EmptyState, Skeleton } from '@/components';
import { formatRelative } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function DeviceRequestsIndex() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<DeviceChangeRequest>(
    attendanceApi.pendingDeviceRequests,
  );

  const renderItem = useCallback(
    ({ item, index: idx }: { item: DeviceChangeRequest; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/(warden)/devices/${item.id}`)}
        >
          <Card variant="elevated" style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.deviceIcon, { backgroundColor: '#8B5CF618' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {item.student?.user?.firstName} {item.student?.user?.lastName}
                </Text>
                <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
                  {item.student?.user?.usn} · {formatRelative(item.createdAt)}
                </Text>
              </View>
              <Badge
                label={item.status === 'PENDING' ? 'Pending' : item.status}
                variant={item.status === 'PENDING' ? 'warning' : item.status === 'APPROVED' ? 'success' : 'error'}
                size="sm"
              />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceLabel, { color: colors.textTertiary }]}>New Device</Text>
              <Text style={[styles.deviceName, { color: colors.text }]}>{item.newDeviceName || 'Unknown'}</Text>
            </View>
            {item.reason && (
              <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.reason}
              </Text>
            )}
          </Card>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors, router],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Device Requests</Text>
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={110} style={{ borderRadius: 16 }} />
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
              icon="phone-portrait-outline"
              title="No Pending Requests"
              description="No device change requests to review."
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
  card: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  deviceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  deviceInfo: { paddingVertical: 6 },
  deviceLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  deviceName: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  reason: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
