import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { notificationsApi, type Notification } from '@/api';
import { Card, EmptyState, Skeleton } from '@/components';
import { smartDate } from '@/utils';
import { usePaginatedApi, useApi } from '@/hooks';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  LEAVE: { icon: 'calendar-outline', color: '#7C3AED' },
  ATTENDANCE: { icon: 'people-outline', color: '#0EA5E9' },
  COMPLAINT: { icon: 'chatbubble-ellipses-outline', color: '#F59E0B' },
  NOTICE: { icon: 'megaphone-outline', color: '#10B981' },
  VIOLATION: { icon: 'alert-circle-outline', color: '#EF4444' },
  GATE: { icon: 'exit-outline', color: '#6366F1' },
  GENERAL: { icon: 'notifications-outline', color: '#64748B' },
};

export default function WardenNotifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { items, loading, refreshing, refresh } = usePaginatedApi<Notification>(
    notificationsApi.list,
  );

  const markAll = useApi(notificationsApi.markAllRead);

  const handleMarkAll = async () => {
    await markAll.execute();
    refresh();
  };

  const handleTap = async (n: Notification) => {
    if (!n.readAt) {
      await notificationsApi.markRead(n.id);
    }
    refresh();
  };

  const renderItem = useCallback(
    ({ item, index: idx }: { item: Notification; index: number }) => {
      const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.GENERAL;
      const isUnread = !item.readAt;
      return (
        <Animated.View entering={FadeInDown.delay(idx * 50).duration(400)}>
          <TouchableOpacity onPress={() => handleTap(item)} activeOpacity={0.7}>
            <Card
              variant="elevated"
              style={[
                styles.card,
                isUnread && { borderLeftWidth: 3, borderLeftColor: colors.primary },
              ]}
            >
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: cfg.color + '18' }]}>
                  <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                </View>
                <View style={styles.body}>
                  <Text
                    style={[
                      styles.title,
                      { color: colors.text, fontWeight: isUnread ? '700' : '500' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {item.body && (
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.body}
                    </Text>
                  )}
                  <Text style={[styles.time, { color: colors.textTertiary }]}>{smartDate(item.createdAt)}</Text>
                </View>
                {isUnread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              </View>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors],
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
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={80} style={{ borderRadius: 16 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  card: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  body: { flex: 1 },
  title: { fontSize: 14, lineHeight: 20 },
  bodyText: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  time: { fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
