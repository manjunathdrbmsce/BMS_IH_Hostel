import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { noticesApi, type Notice } from '@/api';
import { Card, Badge, EmptyState, Skeleton } from '@/components';
import { formatRelative } from '@/utils';
import { usePaginatedApi } from '@/hooks';

export default function ParentNotices() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<Notice>(
    noticesApi.list,
  );

  const renderItem = useCallback(
    ({ item, index: idx }: { item: Notice; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 60).duration(400)}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.titleRow}>
            {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <Text style={[styles.cardPreview, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.content}
          </Text>
          <View style={styles.metaRow}>
            <Badge
              label={item.priority}
              variant={item.priority === 'URGENT' ? 'error' : item.priority === 'WARNING' ? 'warning' : 'info'}
              size="sm"
            />
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatRelative(item.createdAt)}
            </Text>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notices</Text>
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={100} style={{ borderRadius: 16 }} />
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
            <EmptyState icon="megaphone-outline" title="No Notices" description="No notices posted yet." />
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  cardPreview: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 12 },
});
