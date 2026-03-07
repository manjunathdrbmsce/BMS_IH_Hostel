import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Card } from '@/components';

const sections = [
  {
    title: 'Management',
    items: [
      { icon: 'people-outline' as const, label: 'Students', route: '/(warden)/students', color: '#6366F1' },
      { icon: 'hardware-chip-outline' as const, label: 'Devices', route: '/(warden)/devices', color: '#0EA5E9' },
      { icon: 'exit-outline' as const, label: 'Gate Passes', route: '/(warden)/gate', color: '#F59E0B' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person-outline' as const, label: 'Profile', route: '/(warden)/profile', color: '#7C3AED' },
      { icon: 'notifications-outline' as const, label: 'Notifications', route: '/(warden)/notifications', color: '#EF4444' },
    ],
  },
];

export default function WardenMore() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>More</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        {sections.map((section, sIdx) => (
          <Animated.View key={section.title} entering={FadeInDown.delay(sIdx * 100).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            <Card variant="elevated" style={{ padding: 4, marginBottom: 8 }}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.route}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(item.route as any);
                  }}
                  activeOpacity={0.6}
                  style={[
                    styles.menuItem,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
});
