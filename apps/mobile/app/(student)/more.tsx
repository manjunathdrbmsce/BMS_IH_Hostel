import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Card } from '@/components';

const MENU_SECTIONS = [
  {
    title: 'Services',
    items: [
      { icon: 'chatbubble-ellipses-outline', label: 'Complaints', route: '/(student)/complaints', color: '#F59E0B' },
      { icon: 'megaphone-outline', label: 'Notices', route: '/(student)/notices', color: '#3B82F6' },
      { icon: 'exit-outline', label: 'Gate Pass', route: '/(student)/gate', color: '#8B5CF6' },
      { icon: 'shield-checkmark-outline', label: 'Violations', route: '/(student)/violations', color: '#EF4444' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'Profile', route: '/(student)/profile', color: '#6366F1' },
      { icon: 'notifications-outline', label: 'Notifications', route: '/(student)/notifications', color: '#10B981' },
    ],
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>More</Text>

        {MENU_SECTIONS.map((section, sIdx) => (
          <Animated.View key={section.title} entering={FadeInDown.delay(sIdx * 100 + 100).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
            <Card variant="outlined" style={{ padding: 0, overflow: 'hidden' }}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(item.route as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
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
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
});
