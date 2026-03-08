import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { messApi, type MessMenuItem, type MealType, type DayOfWeek } from '@/api';
import { Card, Skeleton, EmptyState } from '@/components';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
  { key: 'FRIDAY', label: 'Friday', short: 'Fri' },
  { key: 'SATURDAY', label: 'Saturday', short: 'Sat' },
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
];

const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

const MEAL_COLORS: Record<MealType, string> = {
  BREAKFAST: '#F59E0B',
  LUNCH: '#3B82F6',
  SNACKS: '#8B5CF6',
  DINNER: '#6366F1',
};

function getTodayDayKey(): DayOfWeek {
  const jsDay = new Date().getDay();
  const map: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return map[jsDay];
}

export default function WeekMenuScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<MessMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayKey());

  const fetchData = useCallback(async () => {
    try {
      const res = await messApi.getWeek();
      setItems(res.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dayItems = items.filter(i => i.dayOfWeek === selectedDay);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Weekly Menu</Text>
        </View>

        {/* Day Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
          {DAYS.map(day => {
            const isToday = day.key === getTodayDayKey();
            const isSelected = day.key === selectedDay;
            return (
              <TouchableOpacity
                key={day.key}
                onPress={() => setSelectedDay(day.key)}
                style={[
                  styles.dayTab,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFF' : colors.text }}>
                  {day.short}
                </Text>
                {isToday && (
                  <View style={[styles.todayDot, { backgroundColor: isSelected ? '#FFF' : colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} width="100%" height={100} style={{ borderRadius: 16 }} />)}
          </View>
        ) : dayItems.length === 0 ? (
          <EmptyState icon="restaurant-outline" title="No Menu" description={`No menu available for ${DAYS.find(d => d.key === selectedDay)?.label}`} />
        ) : (
          <View style={{ gap: 14 }}>
            {MEAL_ORDER.map((mealType, idx) => {
              const item = dayItems.find(i => i.mealType === mealType);
              if (!item) return null;
              const mealColor = MEAL_COLORS[mealType];

              return (
                <Animated.View key={mealType} entering={FadeInDown.delay(idx * 70).duration(350)}>
                  <Card variant="elevated" style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <View style={[styles.mealIndicator, { backgroundColor: mealColor }]} />
                      <Text style={[styles.mealTitle, { color: colors.text }]}>
                        {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                      </Text>
                    </View>
                    <View style={{ gap: 4, marginTop: 8 }}>
                      {item.dishes.map((dish, di) => (
                        <Text key={di} style={[styles.dishText, { color: colors.textSecondary }]}>
                          • {dish}
                        </Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  dayTabs: { gap: 8, paddingBottom: 4 },
  dayTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  mealCard: { padding: 16 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealIndicator: { width: 4, height: 20, borderRadius: 2 },
  mealTitle: { fontSize: 16, fontWeight: '700' },
  dishText: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
});
