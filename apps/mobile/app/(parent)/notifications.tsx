import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { notificationsApi, type Notification } from '@/api';
import { Card, Button, EmptyState, Skeleton } from '@/components';
import { formatRelative } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function ParentNotifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [markingAll, setMarkingAll] = useState(false);

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<Notification>(
    notificationsApi.list,
  );

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await notificationsApi.markAllRead();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch {
      //
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = useCallback(
    ({ item, index: idx }: { item: Notification; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 50).duration(400)}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (!item.readAt) notificationsApi.markRead(item.id).then(() => refresh());
          }}
        >
          <Card variant={item.readAt ? 'outlined' : 'elevated'} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text, fontWeight: item.readAt ? '500' : '700' }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[styles.cardTime, { color: colors.textTertiary }]}>
                  {formatRelative(item.createdAt)}
                </Text>
              </View>
              {!item.readAt && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    ),
    [colors, refresh],
  );

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <Button title="Read all" variant="ghost" size="sm" loading={markingAll} onPress={handleMarkAllRead} />
        )}
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={72} style={{ borderRadius: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="notifications-off-outline" title="No Notifications" description="You're all caught up!" />
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
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, marginBottom: 2 },
  cardBody: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  cardTime: { fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
