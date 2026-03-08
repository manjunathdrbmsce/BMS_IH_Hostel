import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { messApi, type TodayMenu, type MealType } from '@/api';
import { Card, Skeleton, EmptyState } from '@/components';

const MEAL_CONFIG: Record<MealType, { icon: string; color: string; time: string }> = {
  BREAKFAST: { icon: 'sunny-outline', color: '#F59E0B', time: '7:00 – 10:00 AM' },
  LUNCH: { icon: 'restaurant-outline', color: '#3B82F6', time: '12:00 – 2:00 PM' },
  SNACKS: { icon: 'cafe-outline', color: '#8B5CF6', time: '4:00 – 6:00 PM' },
  DINNER: { icon: 'moon-outline', color: '#6366F1', time: '7:00 – 10:00 PM' },
};

const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

function getCurrentMeal(): MealType | null {
  const h = new Date().getHours();
  if (h >= 7 && h < 10) return 'BREAKFAST';
  if (h >= 12 && h < 14) return 'LUNCH';
  if (h >= 16 && h < 18) return 'SNACKS';
  if (h >= 19 && h < 22) return 'DINNER';
  return null;
}

export default function MessIndex() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<TodayMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentMeal = getCurrentMeal();

  const fetchData = useCallback(async () => {
    try {
      const res = await messApi.getToday();
      setData(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getDayLabel = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Today's Menu</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{getDayLabel()}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(student)/mess/week')}
            style={[styles.weekBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Week</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} width="100%" height={130} style={{ borderRadius: 16 }} />)}
          </View>
        ) : !data?.items?.length ? (
          <EmptyState icon="restaurant-outline" title="No Menu Today" description="Menu hasn't been published yet" />
        ) : (
          <View style={{ gap: 16 }}>
            {MEAL_ORDER.map((mealType, idx) => {
              const item = data.items.find(i => i.mealType === mealType);
              if (!item) return null;
              const config = MEAL_CONFIG[mealType];
              const isCurrent = currentMeal === mealType;

              return (
                <Animated.View key={mealType} entering={FadeInDown.delay(idx * 80).duration(400)}>
                  <Card
                    variant="elevated"
                    style={[
                      styles.mealCard,
                      isCurrent && { borderWidth: 2, borderColor: config.color },
                    ]}
                  >
                    <View style={styles.mealHeader}>
                      <View style={[styles.mealIcon, { backgroundColor: config.color + '18' }]}>
                        <Ionicons name={config.icon as any} size={22} color={config.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.mealTitle, { color: colors.text }]}>
                            {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                          </Text>
                          {isCurrent && (
                            <View style={[styles.liveBadge, { backgroundColor: config.color }]}>
                              <Text style={styles.liveText}>NOW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.mealTime, { color: colors.textTertiary }]}>{config.time}</Text>
                      </View>
                    </View>
                    <View style={styles.dishList}>
                      {item.dishes.map((dish, di) => (
                        <View key={di} style={styles.dishItem}>
                          <View style={[styles.dishDot, { backgroundColor: config.color }]} />
                          <Text style={[styles.dishText, { color: colors.textSecondary }]}>{dish}</Text>
                        </View>
                      ))}
                    </View>
                    {item.note && (
                      <Text style={[styles.note, { color: colors.textTertiary }]}>{item.note}</Text>
                    )}
                  </Card>
                </Animated.View>
              );
            })}

            {/* Quick Actions */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push('/(student)/mess/history')}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={[styles.actionLabel, { color: colors.text }]}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push('/(student)/mess/feedback')}
                >
                  <Ionicons name="star-outline" size={20} color={colors.primary} />
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Feedback</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  weekBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  mealCard: { padding: 16 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  mealIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { fontSize: 17, fontWeight: '700' },
  mealTime: { fontSize: 12, marginTop: 2 },
  liveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dishList: { gap: 6 },
  dishItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dishDot: { width: 6, height: 6, borderRadius: 3 },
  dishText: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  actionLabel: { fontSize: 14, fontWeight: '600' },
});
