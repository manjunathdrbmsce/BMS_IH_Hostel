import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { messApi, type LiveCounts, type MealType } from '@/api';
import { Card, StatCard, Skeleton, EmptyState } from '@/components';

const MEAL_CONFIG: Record<MealType, { icon: string; color: string }> = {
  BREAKFAST: { icon: 'sunny-outline', color: '#F59E0B' },
  LUNCH: { icon: 'restaurant-outline', color: '#3B82F6' },
  SNACKS: { icon: 'cafe-outline', color: '#8B5CF6' },
  DINNER: { icon: 'moon-outline', color: '#6366F1' },
};

export default function WardenMessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [liveData, setLiveData] = useState<LiveCounts | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [liveRes, statsRes] = await Promise.all([
        messApi.getLiveCounts(),
        messApi.getStats(),
      ]);
      setLiveData(liveRes.data.data);
      setStats(statsRes.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mess Overview</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={120} style={{ borderRadius: 16 }} />)}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Stats Cards */}
            {stats && (
              <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <View style={styles.statsRow}>
                  <StatCard title="Today's Meals" value={stats.todayTotal || 0} icon="restaurant" color="#3B82F6" />
                  <StatCard title="Guests" value={stats.todayGuests || 0} icon="people" color="#8B5CF6" />
                </View>
                <View style={[styles.statsRow, { marginTop: 10 }]}>
                  <StatCard title="Avg Rating" value={stats.avgRating ? Number(stats.avgRating).toFixed(1) : '—'} icon="star" color="#F59E0B" />
                  <StatCard title="Pending Rebates" value={stats.pendingRebates || 0} icon="receipt" color="#EF4444" />
                </View>
              </Animated.View>
            )}

            {/* Live Meal Counts */}
            {liveData && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Live Counts</Text>
                <View style={{ gap: 10 }}>
                  {(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as MealType[]).map(mealType => {
                    const count = liveData.counts?.find(c => c.mealType === mealType);
                    const config = MEAL_CONFIG[mealType];
                    const isCurrent = liveData.currentMeal === mealType;

                    return (
                      <Card key={mealType} variant="elevated" style={[styles.mealCard, isCurrent && { borderWidth: 2, borderColor: config.color }]}>
                        <View style={styles.mealRow}>
                          <View style={[styles.mealIcon, { backgroundColor: config.color + '18' }]}>
                            <Ionicons name={config.icon as any} size={22} color={config.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.mealLabel, { color: colors.text }]}>
                                {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                              </Text>
                              {isCurrent && (
                                <View style={[styles.liveBadge, { backgroundColor: config.color }]}>
                                  <Text style={styles.liveBadgeText}>LIVE</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.mealSubtext, { color: colors.textTertiary }]}>
                              {count?.guests || 0} guests
                            </Text>
                          </View>
                          <Text style={[styles.mealCount, { color: colors.text }]}>
                            {count?.students || 0}
                          </Text>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  mealCard: { padding: 14 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { fontSize: 16, fontWeight: '700' },
  mealSubtext: { fontSize: 12, marginTop: 2 },
  mealCount: { fontSize: 28, fontWeight: '800' },
  liveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});
