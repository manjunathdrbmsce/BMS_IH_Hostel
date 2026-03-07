import React, { useCallback, useEffect, useState } from 'react';
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

const NOTIF_ICONS: Record<string, { icon: string; color: string }> = {
  LEAVE: { icon: 'calendar-outline', color: '#6366F1' },
  ATTENDANCE: { icon: 'qr-code-outline', color: '#10B981' },
  COMPLAINT: { icon: 'chatbubble-outline', color: '#F59E0B' },
  NOTICE: { icon: 'megaphone-outline', color: '#3B82F6' },
  VIOLATION: { icon: 'alert-circle-outline', color: '#EF4444' },
  GATE: { icon: 'exit-outline', color: '#8B5CF6' },
  GENERAL: { icon: 'notifications-outline', color: '#6B7280' },
};

export default function NotificationsScreen() {
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

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      refresh();
    } catch {
      //
    }
  };

  const renderItem = useCallback(
    ({ item, index: idx }: { item: Notification; index: number }) => {
      const config = NOTIF_ICONS[item.type] || NOTIF_ICONS.GENERAL;
      const isRead = !!item.readAt;
      return (
        <Animated.View entering={FadeInDown.delay(idx * 50).duration(400)}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!isRead) handleMarkRead(item.id);
            }}
          >
            <Card
              variant={isRead ? 'outlined' : 'elevated'}
              style={[styles.card, !isRead && { borderLeftWidth: 3, borderLeftColor: config.color }]}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { backgroundColor: config.color + '18' }]}>
                  <Ionicons name={config.icon as any} size={20} color={config.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.text, fontWeight: isRead ? '500' : '700' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={[styles.cardTime, { color: colors.textTertiary }]}>
                    {formatRelative(item.createdAt)}
                  </Text>
                </View>
                {!isRead && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, refresh],
  );

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          <View style={{ flex: 1 }} />
          {unreadCount > 0 && (
            <Button
              title="Mark all read"
              variant="ghost"
              size="sm"
              loading={markingAll}
              onPress={handleMarkAllRead}
            />
          )}
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={80} style={{ borderRadius: 12 }} />
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="No Notifications"
              description="You're all caught up!"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, marginBottom: 2 },
  cardBody: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  cardTime: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
