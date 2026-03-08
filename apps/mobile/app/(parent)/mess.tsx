import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { messApi, type TodayMenu, type MealType } from '@/api';
import { Card, Skeleton, EmptyState } from '@/components';

const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

const MEAL_CONFIG: Record<MealType, { icon: string; color: string }> = {
  BREAKFAST: { icon: 'sunny-outline', color: '#F59E0B' },
  LUNCH: { icon: 'restaurant-outline', color: '#3B82F6' },
  SNACKS: { icon: 'cafe-outline', color: '#8B5CF6' },
  DINNER: { icon: 'moon-outline', color: '#6366F1' },
};

export default function ParentMessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<TodayMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await messApi.getToday();
      setData(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getDayLabel = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Mess Menu</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{getDayLabel()}'s Menu</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} width="100%" height={100} style={{ borderRadius: 16 }} />)}
          </View>
        ) : !data?.items?.length ? (
          <EmptyState icon="restaurant-outline" title="No Menu Available" description="Today's menu hasn't been published yet" />
        ) : (
          <View style={{ gap: 14 }}>
            {MEAL_ORDER.map((mealType, idx) => {
              const item = data.items.find(i => i.mealType === mealType);
              if (!item) return null;
              const config = MEAL_CONFIG[mealType];

              return (
                <Animated.View key={mealType} entering={FadeInDown.delay(idx * 80).duration(400)}>
                  <Card variant="elevated" style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <View style={[styles.mealIcon, { backgroundColor: config.color + '18' }]}>
                        <Ionicons name={config.icon as any} size={22} color={config.color} />
                      </View>
                      <Text style={[styles.mealTitle, { color: colors.text }]}>
                        {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                      </Text>
                    </View>
                    <View style={{ gap: 4, marginTop: 8 }}>
                      {item.dishes.map((dish, di) => (
                        <Text key={di} style={[styles.dishText, { color: colors.textSecondary }]}>• {dish}</Text>
                      ))}
                    </View>
                    {item.note && (
                      <Text style={[styles.note, { color: colors.textTertiary }]}>{item.note}</Text>
                    )}
                  </Card>
                </Animated.View>
              );
            })}
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
  mealCard: { padding: 16 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { fontSize: 17, fontWeight: '700' },
  dishText: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
});
