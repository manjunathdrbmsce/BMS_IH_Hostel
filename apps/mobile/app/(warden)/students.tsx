import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { studentsApi } from '@/api';
import { Card, Avatar, Badge, EmptyState, Skeleton } from '@/components';
import { usePaginatedApi } from '@/hooks';

export default function StudentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { items, loading, refreshing, refresh, loadMore, hasMore } = usePaginatedApi<any>(
    studentsApi.list,
    search ? { search } : {},
  );

  const renderItem = useCallback(
    ({ item, index: idx }: { item: any; index: number }) => (
      <Animated.View entering={FadeInDown.delay(idx * 40).duration(400)}>
        <Card variant="outlined" style={styles.card}>
          <View style={styles.cardRow}>
            <Avatar name={`${item.user?.firstName || ''} ${item.user?.lastName || ''}`} size={44} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardName, { color: colors.text }]}>
                {item.user?.firstName} {item.user?.lastName}
              </Text>
              <Text style={[styles.cardInfo, { color: colors.textTertiary }]}>
                {item.rollNumber} · {item.department}
              </Text>
            </View>
            {item.roomNumber && (
              <Badge label={`Room ${item.roomNumber}`} variant="default" size="sm" />
            )}
          </View>
        </Card>
      </Animated.View>
    ),
    [colors],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Students</Text>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or roll number..."
            placeholderTextColor={colors.textTertiary}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ padding: 20, gap: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={64} style={{ borderRadius: 12 }} />
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
            <EmptyState icon="people-outline" title="No Students" description={search ? 'No students match your search.' : 'No students found.'} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  card: { padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardContent: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700' },
  cardInfo: { fontSize: 12, marginTop: 2 },
});
